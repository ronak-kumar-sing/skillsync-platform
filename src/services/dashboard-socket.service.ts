import { broadcastDashboardUpdate, broadcastMetricUpdate } from '@/lib/socket-server';
import { QueueManagerService } from './queue-manager.service';
import prisma from '@/lib/prisma';

export class DashboardSocketService {
  private static updateInterval: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * Initialize dashboard real-time updates
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Dashboard Socket Service...');

    // Start periodic updates for metrics that change frequently
    this.startPeriodicUpdates();

    this.isInitialized = true;
    console.log('Dashboard Socket Service initialized');
  }

  /**
   * Start periodic updates for real-time metrics
   */
  private static startPeriodicUpdates(): void {
    // Update metrics every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.broadcastQueueMetrics();
        await this.broadcastSessionMetrics();
      } catch (error) {
        console.error('Error in periodic dashboard updates:', error);
      }
    }, 30000); // 30 seconds

    // Initial broadcast
    setTimeout(async () => {
      await this.broadcastQueueMetrics();
      await this.broadcastSessionMetrics();
    }, 1000);
  }

  /**
   * Broadcast queue metrics update
   */
  static async broadcastQueueMetrics(): Promise<void> {
    try {
      const queueStats = await QueueManagerService.getQueueStats();

      broadcastMetricUpdate('queue', {
        totalInQueue: queueStats.totalInQueue,
        bySessionType: queueStats.bySessionType,
        averageWaitTime: queueStats.averageWaitTime,
        matchesPerHour: queueStats.matchesPerHour,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error broadcasting queue metrics:', error);
    }
  }

  /**
   * Broadcast session metrics update
   */
  static async broadcastSessionMetrics(): Promise<void> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [activeSessions, completedToday, averageDuration] = await Promise.all([
        // Currently active sessions
        prisma.session.count({
          where: {
            endTime: null,
            startTime: {
              gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // Last 4 hours
            }
          }
        }),

        // Sessions completed today
        prisma.session.count({
          where: {
            endTime: {
              gte: todayStart,
              lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Average session duration
        prisma.session.aggregate({
          _avg: {
            durationMinutes: true
          },
          where: {
            endTime: { not: null },
            durationMinutes: { not: null }
          }
        })
      ]);

      broadcastMetricUpdate('session', {
        activeSessions,
        completedToday,
        averageSessionDuration: averageDuration._avg.durationMinutes || 45,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error broadcasting session metrics:', error);
    }
  }

  /**
   * Broadcast new activity to activity feed
   */
  static broadcastNewActivity(activity: {
    id: string;
    type: string;
    title: string;
    description: string;
    userId?: string;
    username?: string;
    metadata?: any;
  }): void {
    const activityWithTimestamp = {
      ...activity,
      timestamp: new Date().toISOString(),
    };

    broadcastDashboardUpdate('activity:new', activityWithTimestamp);
  }

  /**
   * Broadcast platform stats update
   */
  static async broadcastStatsUpdate(): Promise<void> {
    try {
      const [totalUsers, activeUsers, totalSessions] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({
          where: {
            isActive: true,
            lastActive: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.session.count({ where: { endTime: { not: null } } })
      ]);

      broadcastDashboardUpdate('stats:update', {
        totalUsers,
        activeUsers,
        totalSessions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error broadcasting stats update:', error);
    }
  }

  /**
   * Broadcast user achievement earned
   */
  static broadcastAchievementEarned(userId: string, username: string, achievementName: string): void {
    this.broadcastNewActivity({
      id: `achievement_${userId}_${Date.now()}`,
      type: 'achievement_earned',
      title: 'Achievement Unlocked',
      description: `${username} earned "${achievementName}"`,
      userId,
      username,
      metadata: { achievementName }
    });
  }

  /**
   * Broadcast session completed
   */
  static broadcastSessionCompleted(
    initiatorId: string,
    initiatorName: string,
    partnerId: string,
    partnerName: string,
    duration: number
  ): void {
    this.broadcastNewActivity({
      id: `session_${initiatorId}_${partnerId}_${Date.now()}`,
      type: 'session_completed',
      title: 'Learning Session Completed',
      description: `${initiatorName} and ${partnerName} completed a ${duration}-minute session`,
      userId: initiatorId,
      username: initiatorName,
      metadata: {
        sessionDuration: duration,
        partnerName
      }
    });
  }

  /**
   * Broadcast user joined platform
   */
  static broadcastUserJoined(userId: string, username: string): void {
    this.broadcastNewActivity({
      id: `user_${userId}_${Date.now()}`,
      type: 'user_joined',
      title: 'New Member Joined',
      description: `${username} joined the SkillSync community`,
      userId,
      username,
      metadata: {}
    });

    // Also update user stats
    this.broadcastStatsUpdate();
  }

  /**
   * Broadcast skill improvement
   */
  static broadcastSkillImproved(userId: string, username: string, skillName: string): void {
    this.broadcastNewActivity({
      id: `skill_${userId}_${skillName}_${Date.now()}`,
      type: 'skill_improved',
      title: 'Skill Added',
      description: `${username} added ${skillName} to their profile`,
      userId,
      username,
      metadata: { skillName }
    });
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
    console.log('Dashboard Socket Service cleaned up');
  }
}