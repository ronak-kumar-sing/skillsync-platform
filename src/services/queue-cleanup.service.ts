import { QueueManagerService } from './queue-manager.service';
import redis from '@/lib/redis';

/**
 * Queue cleanup service for maintaining queue health and performance
 */
export class QueueCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static rebalanceInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the queue cleanup service
   */
  static start(): void {
    if (this.isRunning) {
      console.log('Queue cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting queue cleanup service...');

    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Error during queue cleanup:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Rebalance queue every 5 minutes for fair distribution
    this.rebalanceInterval = setInterval(async () => {
      try {
        await this.performRebalancing();
      } catch (error) {
        console.error('Error during queue rebalancing:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Perform initial cleanup
    this.performCleanup().catch(console.error);
  }

  /**
   * Stop the queue cleanup service
   */
  static stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping queue cleanup service...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.rebalanceInterval = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform comprehensive queue cleanup
   */
  private static async performCleanup(): Promise<void> {
    const startTime = Date.now();

    try {
      // Clean up expired entries
      const expiredCount = await QueueManagerService.cleanupExpiredEntries();

      // Clean up orphaned Redis keys
      const orphanedCount = await this.cleanupOrphanedKeys();

      // Update queue health metrics
      await this.updateHealthMetrics();

      const duration = Date.now() - startTime;

      if (expiredCount > 0 || orphanedCount > 0) {
        console.log(
          `Queue cleanup completed in ${duration}ms: ` +
          `${expiredCount} expired entries, ${orphanedCount} orphaned keys removed`
        );
      }
    } catch (error) {
      console.error('Queue cleanup failed:', error);
    }
  }

  /**
   * Perform queue rebalancing for fair distribution
   */
  private static async performRebalancing(): Promise<void> {
    const startTime = Date.now();

    try {
      await QueueManagerService.rebalanceQueue();

      const duration = Date.now() - startTime;
      console.log(`Queue rebalancing completed in ${duration}ms`);
    } catch (error) {
      console.error('Queue rebalancing failed:', error);
    }
  }

  /**
   * Clean up orphaned Redis keys that may be left behind
   */
  private static async cleanupOrphanedKeys(): Promise<number> {
    let cleanedCount = 0;

    try {
      // Get all user queue data keys
      const userKeys = await redis.keys('queue:user:*');

      for (const key of userKeys) {
        const data = await redis.get(key);

        if (!data) {
          continue;
        }

        try {
          const queueEntry = JSON.parse(data);

          // Check if entry is expired
          if (queueEntry.expiresAt < Date.now()) {
            await redis.del(key);
            cleanedCount++;
          }
        } catch (error) {
          // Invalid data, remove the key
          await redis.del(key);
          cleanedCount++;
        }
      }

      // Clean up empty priority queues
      const priorityQueues = ['high', 'medium', 'low'];
      for (const priority of priorityQueues) {
        const queueKey = `queue:matching:priority:${priority}`;
        const length = await redis.llen(queueKey);

        if (length === 0) {
          await redis.del(queueKey);
        }
      }

      // Clean up empty session type queues
      const sessionTypes = ['learning', 'teaching', 'collaboration'];
      for (const type of sessionTypes) {
        const queueKey = `queue:matching:type:${type}`;
        const length = await redis.llen(queueKey);

        if (length === 0) {
          await redis.del(queueKey);
        }
      }

    } catch (error) {
      console.error('Error cleaning orphaned keys:', error);
    }

    return cleanedCount;
  }

  /**
   * Update queue health metrics
   */
  private static async updateHealthMetrics(): Promise<void> {
    try {
      const stats = await QueueManagerService.getQueueStats();

      const healthMetrics = {
        totalUsers: stats.totalInQueue,
        queueHealth: this.calculateQueueHealth(stats),
        lastCleanup: Date.now(),
        uptimeHours: this.getUptimeHours(),
      };

      await redis.setex('queue:health', 300, JSON.stringify(healthMetrics));
    } catch (error) {
      console.error('Error updating health metrics:', error);
    }
  }

  /**
   * Calculate queue health score (0-100)
   */
  private static calculateQueueHealth(stats: any): number {
    let healthScore = 100;

    // Penalize if queue is too large (indicates matching issues)
    if (stats.totalInQueue > 100) {
      healthScore -= Math.min((stats.totalInQueue - 100) * 0.5, 30);
    }

    // Penalize if average wait time is too high
    if (stats.averageMatchTime > 300) { // 5 minutes
      healthScore -= Math.min((stats.averageMatchTime - 300) * 0.1, 20);
    }

    // Bonus for active matching
    if (stats.matchesPerHour > 10) {
      healthScore += Math.min(stats.matchesPerHour * 0.5, 10);
    }

    return Math.max(0, Math.min(100, Math.round(healthScore)));
  }

  /**
   * Get service uptime in hours
   */
  private static getUptimeHours(): number {
    return process.uptime() / 3600;
  }

  /**
   * Get queue health status
   */
  static async getHealthStatus(): Promise<{
    isHealthy: boolean;
    metrics: any;
    issues: string[];
  }> {
    const healthData = await redis.get('queue:health');
    const stats = await QueueManagerService.getQueueStats();

    const issues: string[] = [];

    // Check for potential issues
    if (stats.totalInQueue > 50) {
      issues.push(`High queue size: ${stats.totalInQueue} users waiting`);
    }

    if (stats.averageMatchTime > 180) {
      issues.push(`Slow matching: ${Math.round(stats.averageMatchTime)}s average`);
    }

    if (stats.matchesPerHour < 5) {
      issues.push(`Low matching rate: ${stats.matchesPerHour} matches/hour`);
    }

    const metrics = healthData ? JSON.parse(healthData) : null;
    const isHealthy = issues.length === 0 && stats.totalInQueue < 100;

    return {
      isHealthy,
      metrics: metrics || { queueHealth: 0, lastCleanup: 0 },
      issues,
    };
  }

  /**
   * Force immediate cleanup (for manual triggers)
   */
  static async forceCleanup(): Promise<{
    expiredEntries: number;
    orphanedKeys: number;
    duration: number;
  }> {
    const startTime = Date.now();

    const expiredEntries = await QueueManagerService.cleanupExpiredEntries();
    const orphanedKeys = await this.cleanupOrphanedKeys();
    await this.updateHealthMetrics();

    const duration = Date.now() - startTime;

    return {
      expiredEntries,
      orphanedKeys,
      duration,
    };
  }
}