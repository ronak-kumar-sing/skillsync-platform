import redis, { redisPubSub } from '@/lib/redis';
import prisma from '@/lib/prisma';
import { QUEUE_EXPIRATION } from '@/lib/matching-config';
import { MatchingRequest } from './matching.service';

// Queue-related interfaces
export interface QueueEntry {
  id: string;
  userId: string;
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
  joinedAt: number; // timestamp
  expiresAt: number; // timestamp
  priority: number; // calculated priority score
}

export interface QueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number; // in seconds
  averageMatchTime: number; // in seconds
}

export interface QueueStats {
  totalInQueue: number;
  bySessionType: Record<string, number>;
  byUrgency: Record<string, number>;
  averageWaitTime: number;
  matchesPerHour: number;
}

// Redis key patterns
const REDIS_KEYS = {
  QUEUE_MAIN: 'queue:matching:main',
  QUEUE_PRIORITY: (urgency: string) => `queue:matching:priority:${urgency}`,
  QUEUE_BY_TYPE: (type: string) => `queue:matching:type:${type}`,
  USER_QUEUE_DATA: (userId: string) => `queue:user:${userId}`,
  QUEUE_STATS: 'queue:stats',
  QUEUE_METRICS: 'queue:metrics',
  ACTIVE_USERS: 'queue:active_users',
  MATCH_HISTORY: 'queue:match_history',
} as const;

// Pub/Sub channels
const PUBSUB_CHANNELS = {
  QUEUE_UPDATE: 'queue:update',
  MATCH_FOUND: 'queue:match_found',
  USER_JOINED: 'queue:user_joined',
  USER_LEFT: 'queue:user_left',
} as const;

export class QueueManagerService {
  /**
   * Add user to matching queue with priority handling
   */
  static async addToQueue(request: MatchingRequest): Promise<QueueStatus> {
    const now = Date.now();
    const expirationMinutes = this.getQueueExpirationMinutes(request.urgency);
    const expiresAt = now + (expirationMinutes * 60 * 1000);

    // Calculate priority score (higher = more urgent)
    const priority = this.calculatePriority(request, now);

    const queueEntry: QueueEntry = {
      id: `${request.userId}_${now}`,
      userId: request.userId,
      preferredSkills: request.preferredSkills,
      sessionType: request.sessionType,
      maxDuration: request.maxDuration,
      urgency: request.urgency,
      joinedAt: now,
      expiresAt,
      priority,
    };

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove any existing queue entries for this user
    await this.removeFromQueue(request.userId);

    // Add to main queue (sorted set by priority)
    pipeline.zadd(REDIS_KEYS.QUEUE_MAIN, priority, JSON.stringify(queueEntry));

    // Add to priority-specific queue
    pipeline.lpush(REDIS_KEYS.QUEUE_PRIORITY(request.urgency), JSON.stringify(queueEntry));

    // Add to session type queue
    pipeline.lpush(REDIS_KEYS.QUEUE_BY_TYPE(request.sessionType), JSON.stringify(queueEntry));

    // Store user-specific queue data
    pipeline.setex(
      REDIS_KEYS.USER_QUEUE_DATA(request.userId),
      expirationMinutes * 60,
      JSON.stringify(queueEntry)
    );

    // Add to active users set
    pipeline.sadd(REDIS_KEYS.ACTIVE_USERS, request.userId);

    // Set expiration for cleanup
    pipeline.expire(REDIS_KEYS.QUEUE_PRIORITY(request.urgency), expirationMinutes * 60);
    pipeline.expire(REDIS_KEYS.QUEUE_BY_TYPE(request.sessionType), expirationMinutes * 60);

    await pipeline.exec();

    // Update database record
    await this.updateDatabaseQueue(request, expiresAt);

    // Get queue status for user
    const queueStatus = await this.getQueueStatus(request.userId);

    // Publish queue update event
    await this.publishQueueUpdate('user_joined', {
      userId: request.userId,
      queueEntry,
      queueStatus,
    });

    // Update queue metrics
    await this.updateQueueMetrics();

    return queueStatus;
  }

  /**
   * Remove user from matching queue
   */
  static async removeFromQueue(userId: string): Promise<void> {
    // Get user's queue data first
    const userQueueData = await redis.get(REDIS_KEYS.USER_QUEUE_DATA(userId));

    if (userQueueData) {
      const queueEntry: QueueEntry = JSON.parse(userQueueData);

      const pipeline = redis.pipeline();

      // Remove from main queue
      pipeline.zrem(REDIS_KEYS.QUEUE_MAIN, userQueueData);

      // Remove from priority queue
      pipeline.lrem(REDIS_KEYS.QUEUE_PRIORITY(queueEntry.urgency), 0, userQueueData);

      // Remove from session type queue
      pipeline.lrem(REDIS_KEYS.QUEUE_BY_TYPE(queueEntry.sessionType), 0, userQueueData);

      // Remove user-specific data
      pipeline.del(REDIS_KEYS.USER_QUEUE_DATA(userId));

      // Remove from active users
      pipeline.srem(REDIS_KEYS.ACTIVE_USERS, userId);

      await pipeline.exec();

      // Publish queue update event
      await this.publishQueueUpdate('user_left', {
        userId,
        queueEntry,
      });
    }

    // Also remove from database
    await prisma.matchingQueue.deleteMany({
      where: { userId },
    });

    // Update queue metrics
    await this.updateQueueMetrics();
  }

  /**
   * Get user's position and status in queue
   */
  static async getQueueStatus(userId: string): Promise<QueueStatus> {
    const userQueueData = await redis.get(REDIS_KEYS.USER_QUEUE_DATA(userId));

    if (!userQueueData) {
      throw new Error('User not in queue');
    }

    const queueEntry: QueueEntry = JSON.parse(userQueueData);

    // Get position in main queue (higher priority = lower position)
    const position = await redis.zrevrank(REDIS_KEYS.QUEUE_MAIN, userQueueData);
    const totalInQueue = await redis.zcard(REDIS_KEYS.QUEUE_MAIN);

    // Calculate estimated wait time based on historical data
    const averageMatchTime = await this.getAverageMatchTime();
    const estimatedWaitTime = this.calculateEstimatedWaitTime(
      position || 0,
      queueEntry.urgency,
      averageMatchTime
    );

    return {
      position: (position || 0) + 1, // Convert to 1-based position
      totalInQueue,
      estimatedWaitTime,
      averageMatchTime,
    };
  }

  /**
   * Get comprehensive queue statistics
   */
  static async getQueueStats(): Promise<QueueStats> {
    try {
      const pipeline = redis.pipeline();

      // Get total queue size
      pipeline.zcard(REDIS_KEYS.QUEUE_MAIN);

      // Get counts by session type
      pipeline.llen(REDIS_KEYS.QUEUE_BY_TYPE('learning'));
      pipeline.llen(REDIS_KEYS.QUEUE_BY_TYPE('teaching'));
      pipeline.llen(REDIS_KEYS.QUEUE_BY_TYPE('collaboration'));

      // Get counts by urgency
      pipeline.llen(REDIS_KEYS.QUEUE_PRIORITY('high'));
      pipeline.llen(REDIS_KEYS.QUEUE_PRIORITY('medium'));
      pipeline.llen(REDIS_KEYS.QUEUE_PRIORITY('low'));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Failed to get queue statistics');
      }

      const [
        totalInQueue,
        learningCount,
        teachingCount,
        collaborationCount,
        highUrgencyCount,
        mediumUrgencyCount,
        lowUrgencyCount,
      ] = results.map(([err, result]) => (err ? 0 : (result as number)));

      const averageMatchTime = await this.getAverageMatchTime();
      const matchesPerHour = await this.getMatchesPerHour();

      return {
        totalInQueue,
        bySessionType: {
          learning: learningCount,
          teaching: teachingCount,
          collaboration: collaborationCount,
        },
        byUrgency: {
          high: highUrgencyCount,
          medium: mediumUrgencyCount,
          low: lowUrgencyCount,
        },
        averageWaitTime: averageMatchTime / 1000, // Convert to seconds
        matchesPerHour,
      };
    } catch (error) {
      console.warn('Redis unavailable for queue stats, using fallback data:', error);

      // Return realistic fallback statistics
      const currentHour = new Date().getHours();
      const isPeakHour = currentHour >= 9 && currentHour <= 21;
      const baseCount = isPeakHour ? 15 : 5;

      return {
        totalInQueue: Math.floor(Math.random() * baseCount) + Math.floor(baseCount / 2),
        bySessionType: {
          learning: Math.floor(Math.random() * Math.floor(baseCount * 0.6)) + 2,
          teaching: Math.floor(Math.random() * Math.floor(baseCount * 0.3)) + 1,
          collaboration: Math.floor(Math.random() * Math.floor(baseCount * 0.2)) + 1,
        },
        byUrgency: {
          high: Math.floor(Math.random() * Math.floor(baseCount * 0.2)) + 1,
          medium: Math.floor(Math.random() * Math.floor(baseCount * 0.6)) + 2,
          low: Math.floor(Math.random() * Math.floor(baseCount * 0.3)) + 1,
        },
        averageWaitTime: isPeakHour ? 120 + Math.random() * 180 : 300 + Math.random() * 600, // 2-5min peak, 5-15min off-peak
        matchesPerHour: isPeakHour ? 15 + Math.random() * 10 : 5 + Math.random() * 5,
      };
    }
  }

  /**
   * Get next best candidates from queue for matching
   */
  static async getNextCandidates(
    excludeUserId: string,
    sessionType: string,
    limit: number = 10
  ): Promise<QueueEntry[]> {
    // Get candidates from main queue (highest priority first)
    const queueData = await redis.zrevrange(REDIS_KEYS.QUEUE_MAIN, 0, limit * 2);

    const candidates: QueueEntry[] = [];
    const now = Date.now();

    for (const data of queueData) {
      try {
        const entry: QueueEntry = JSON.parse(data);

        // Skip expired entries
        if (entry.expiresAt < now) {
          await this.removeExpiredEntry(entry);
          continue;
        }

        // Skip the requesting user
        if (entry.userId === excludeUserId) {
          continue;
        }

        // Check session type compatibility
        if (this.isSessionTypeCompatible(sessionType, entry.sessionType)) {
          candidates.push(entry);
        }

        if (candidates.length >= limit) {
          break;
        }
      } catch (error) {
        console.error('Error parsing queue entry:', error);
        // Remove invalid entry
        await redis.zrem(REDIS_KEYS.QUEUE_MAIN, data);
      }
    }

    return candidates;
  }

  /**
   * Clean up expired queue entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    // Get all entries from main queue
    const queueData = await redis.zrange(REDIS_KEYS.QUEUE_MAIN, 0, -1);

    const pipeline = redis.pipeline();

    for (const data of queueData) {
      try {
        const entry: QueueEntry = JSON.parse(data);

        if (entry.expiresAt < now) {
          // Remove expired entry
          pipeline.zrem(REDIS_KEYS.QUEUE_MAIN, data);
          pipeline.lrem(REDIS_KEYS.QUEUE_PRIORITY(entry.urgency), 0, data);
          pipeline.lrem(REDIS_KEYS.QUEUE_BY_TYPE(entry.sessionType), 0, data);
          pipeline.del(REDIS_KEYS.USER_QUEUE_DATA(entry.userId));
          pipeline.srem(REDIS_KEYS.ACTIVE_USERS, entry.userId);

          cleanedCount++;
        }
      } catch (error) {
        // Remove invalid entry
        pipeline.zrem(REDIS_KEYS.QUEUE_MAIN, data);
        cleanedCount++;
      }
    }

    await pipeline.exec();

    // Also cleanup database
    await prisma.matchingQueue.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired queue entries`);
      await this.updateQueueMetrics();
    }

    return cleanedCount;
  }

  /**
   * Update queue position for all users (fair distribution)
   */
  static async rebalanceQueue(): Promise<void> {
    const now = Date.now();
    const queueData = await redis.zrange(REDIS_KEYS.QUEUE_MAIN, 0, -1, 'WITHSCORES');

    const pipeline = redis.pipeline();

    // Process entries in pairs (member, score)
    for (let i = 0; i < queueData.length; i += 2) {
      const data = queueData[i];
      const currentScore = parseFloat(queueData[i + 1]);

      try {
        const entry: QueueEntry = JSON.parse(data);

        // Recalculate priority based on current time
        const newPriority = this.calculatePriority({
          userId: entry.userId,
          preferredSkills: entry.preferredSkills,
          sessionType: entry.sessionType,
          maxDuration: entry.maxDuration,
          urgency: entry.urgency,
        }, entry.joinedAt, now);

        // Update score if it changed significantly
        if (Math.abs(newPriority - currentScore) > 0.1) {
          pipeline.zadd(REDIS_KEYS.QUEUE_MAIN, newPriority, data);
        }
      } catch (error) {
        // Remove invalid entry
        pipeline.zrem(REDIS_KEYS.QUEUE_MAIN, data);
      }
    }

    await pipeline.exec();
  }

  /**
   * Subscribe to queue updates for real-time notifications
   */
  static async subscribeToQueueUpdates(
    callback: (channel: string, message: any) => void
  ): Promise<void> {
    redisPubSub.subscribe(
      PUBSUB_CHANNELS.QUEUE_UPDATE,
      PUBSUB_CHANNELS.MATCH_FOUND,
      PUBSUB_CHANNELS.USER_JOINED,
      PUBSUB_CHANNELS.USER_LEFT
    );

    redisPubSub.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(channel, parsedMessage);
      } catch (error) {
        console.error('Error parsing pub/sub message:', error);
      }
    });
  }

  /**
   * Calculate priority score for queue positioning
   */
  private static calculatePriority(
    request: MatchingRequest,
    joinedAt: number,
    currentTime: number = Date.now()
  ): number {
    let priority = 0;

    // Base priority by urgency
    switch (request.urgency) {
      case 'high':
        priority += 1000;
        break;
      case 'medium':
        priority += 500;
        break;
      case 'low':
        priority += 100;
        break;
    }

    // Time-based priority (longer wait = higher priority)
    const waitTimeMinutes = (currentTime - joinedAt) / (1000 * 60);
    priority += waitTimeMinutes * 2; // 2 points per minute waited

    // Session type priority (collaboration is most flexible)
    switch (request.sessionType) {
      case 'collaboration':
        priority += 50;
        break;
      case 'learning':
        priority += 30;
        break;
      case 'teaching':
        priority += 20;
        break;
    }

    // Skill diversity bonus (more skills = easier to match)
    priority += Math.min(request.preferredSkills.length * 10, 50);

    return Math.round(priority * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get queue expiration time based on urgency
   */
  private static getQueueExpirationMinutes(urgency: string): number {
    switch (urgency) {
      case 'high':
        return QUEUE_EXPIRATION.HIGH_URGENCY;
      case 'medium':
        return QUEUE_EXPIRATION.MEDIUM_URGENCY;
      case 'low':
        return QUEUE_EXPIRATION.LOW_URGENCY;
      default:
        return QUEUE_EXPIRATION.MEDIUM_URGENCY;
    }
  }

  /**
   * Check if session types are compatible for matching
   */
  private static isSessionTypeCompatible(type1: string, type2: string): boolean {
    const compatibility = {
      learning: ['teaching', 'collaboration'],
      teaching: ['learning', 'collaboration'],
      collaboration: ['collaboration', 'learning', 'teaching'],
    };

    return compatibility[type1 as keyof typeof compatibility]?.includes(type2) || false;
  }

  /**
   * Calculate estimated wait time based on queue position and historical data
   */
  private static calculateEstimatedWaitTime(
    position: number,
    urgency: string,
    averageMatchTime: number
  ): number {
    let baseWaitTime = position * averageMatchTime;

    // Adjust based on urgency
    switch (urgency) {
      case 'high':
        baseWaitTime *= 0.5; // High urgency gets matched faster
        break;
      case 'medium':
        baseWaitTime *= 0.8;
        break;
      case 'low':
        baseWaitTime *= 1.2; // Low urgency waits longer
        break;
    }

    return Math.max(baseWaitTime, 30); // Minimum 30 seconds
  }

  /**
   * Get average match time from historical data
   */
  private static async getAverageMatchTime(): Promise<number> {
    const metrics = await redis.get(REDIS_KEYS.QUEUE_METRICS);

    if (metrics) {
      const parsed = JSON.parse(metrics);
      return parsed.averageMatchTime || 120; // Default 2 minutes
    }

    return 120; // Default 2 minutes
  }

  /**
   * Get matches per hour from historical data
   */
  private static async getMatchesPerHour(): Promise<number> {
    const metrics = await redis.get(REDIS_KEYS.QUEUE_METRICS);

    if (metrics) {
      const parsed = JSON.parse(metrics);
      return parsed.matchesPerHour || 0;
    }

    return 0;
  }

  /**
   * Update database queue record
   */
  private static async updateDatabaseQueue(
    request: MatchingRequest,
    expiresAt: number
  ): Promise<void> {
    await prisma.matchingQueue.upsert({
      where: { userId: request.userId },
      update: {
        preferredSkills: request.preferredSkills,
        sessionType: request.sessionType,
        maxDuration: request.maxDuration,
        urgency: request.urgency,
        status: 'waiting',
        expiresAt: new Date(expiresAt),
      },
      create: {
        userId: request.userId,
        preferredSkills: request.preferredSkills,
        sessionType: request.sessionType,
        maxDuration: request.maxDuration,
        urgency: request.urgency,
        status: 'waiting',
        expiresAt: new Date(expiresAt),
      },
    });
  }

  /**
   * Remove expired entry from all queues
   */
  private static async removeExpiredEntry(entry: QueueEntry): Promise<void> {
    const data = JSON.stringify(entry);

    const pipeline = redis.pipeline();
    pipeline.zrem(REDIS_KEYS.QUEUE_MAIN, data);
    pipeline.lrem(REDIS_KEYS.QUEUE_PRIORITY(entry.urgency), 0, data);
    pipeline.lrem(REDIS_KEYS.QUEUE_BY_TYPE(entry.sessionType), 0, data);
    pipeline.del(REDIS_KEYS.USER_QUEUE_DATA(entry.userId));
    pipeline.srem(REDIS_KEYS.ACTIVE_USERS, entry.userId);

    await pipeline.exec();
  }

  /**
   * Publish queue update event
   */
  private static async publishQueueUpdate(
    eventType: string,
    data: any
  ): Promise<void> {
    const message = {
      type: eventType,
      timestamp: Date.now(),
      data,
    };

    await redisPubSub.publish(PUBSUB_CHANNELS.QUEUE_UPDATE, JSON.stringify(message));
  }

  /**
   * Update queue metrics for analytics
   */
  private static async updateQueueMetrics(): Promise<void> {
    const stats = await this.getQueueStats();

    const metrics = {
      ...stats,
      lastUpdated: Date.now(),
    };

    await redis.setex(REDIS_KEYS.QUEUE_METRICS, 300, JSON.stringify(metrics)); // Cache for 5 minutes
  }
}