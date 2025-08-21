import prisma from '@/lib/prisma';
import { AchievementService } from './achievement.service';
import { achievementNotificationService } from './achievement-notification.service';

export interface SessionCompletionData {
  sessionId: string;
  userId: string;
  partnerId: string;
  durationMinutes: number;
  rating?: number;
  feedback?: string;
  topics: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
}

export interface SessionStats {
  totalSessions: number;
  totalMinutesLearned: number;
  averageRating: number;
  skillsLearned: number;
  skillsTaught: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: Date;
}

export class SessionService {
  /**
   * Complete a session and update user stats
   */
  static async completeSession(data: SessionCompletionData): Promise<{
    session: any;
    newAchievements: any[];
    updatedStats: SessionStats;
  }> {
    try {
      // Update the session record
      const session = await prisma.session.update({
        where: { id: data.sessionId },
        data: {
          endTime: new Date(),
          durationMinutes: data.durationMinutes,
          status: 'completed',
          topics: data.topics,
          ...(data.userId === session?.initiatorId
            ? {
              ratingInitiator: data.rating,
              feedbackInitiator: data.feedback
            }
            : {
              ratingPartner: data.rating,
              feedbackPartner: data.feedback
            }
          )
        }
      });

      // Update user stats for both participants
      const userStats = await this.updateUserStats(data.userId, data);
      const partnerStats = await this.updateUserStats(data.partnerId, {
        ...data,
        userId: data.partnerId,
        partnerId: data.userId
      });

      // Check for new achievements for both users
      const userAchievements = await AchievementService.checkAndAwardAchievements(data.userId);
      const partnerAchievements = await AchievementService.checkAndAwardAchievements(data.partnerId);

      // Trigger achievement notifications (these would be sent via WebSocket in a real app)
      if (userAchievements.length > 0) {
        achievementNotificationService.addAchievements(userAchievements);
      }
      if (partnerAchievements.length > 0) {
        achievementNotificationService.addAchievements(partnerAchievements);
      }

      return {
        session,
        newAchievements: [...userAchievements, ...partnerAchievements],
        updatedStats: userStats
      };
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  /**
   * Update user statistics after a session
   */
  private static async updateUserStats(userId: string, data: SessionCompletionData): Promise<SessionStats> {
    try {
      // Get or create user stats
      let userStats = await prisma.userStats.findUnique({
        where: { userId }
      });

      if (!userStats) {
        userStats = await prisma.userStats.create({
          data: {
            userId,
            totalSessions: 0,
            totalMinutesLearned: 0,
            skillsLearned: 0,
            skillsTaught: 0,
            achievementPoints: 0,
            currentStreak: 0,
            longestStreak: 0
          }
        });
      }

      // Calculate new stats
      const newTotalSessions = userStats.totalSessions + 1;
      const newTotalMinutes = userStats.totalMinutesLearned + data.durationMinutes;

      // Calculate average rating
      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { partnerId: userId }
          ],
          status: 'completed'
        }
      });

      const ratings = sessions.flatMap(session => [
        session.ratingInitiator,
        session.ratingPartner
      ]).filter(rating => rating !== null) as number[];

      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

      // Calculate streak
      const { currentStreak, longestStreak } = await this.calculateStreak(userId);

      // Count skills learned/taught
      const skillsLearned = await this.countSkillsLearned(userId);
      const skillsTaught = await this.countSkillsTaught(userId);

      // Update user stats
      const updatedStats = await prisma.userStats.update({
        where: { userId },
        data: {
          totalSessions: newTotalSessions,
          totalMinutesLearned: newTotalMinutes,
          averageRating,
          skillsLearned,
          skillsTaught,
          currentStreak,
          longestStreak: Math.max(longestStreak, userStats.longestStreak),
          lastSessionDate: new Date()
        }
      });

      return {
        totalSessions: updatedStats.totalSessions,
        totalMinutesLearned: updatedStats.totalMinutesLearned,
        averageRating: updatedStats.averageRating || 0,
        skillsLearned: updatedStats.skillsLearned,
        skillsTaught: updatedStats.skillsTaught,
        currentStreak: updatedStats.currentStreak,
        longestStreak: updatedStats.longestStreak,
        lastSessionDate: updatedStats.lastSessionDate || new Date()
      };
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Calculate user's learning streak
   */
  private static async calculateStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    try {
      // Get all completed sessions ordered by date
      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { partnerId: userId }
          ],
          status: 'completed'
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      if (sessions.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
      }

      // Group sessions by date
      const sessionsByDate = new Map<string, number>();
      sessions.forEach(session => {
        const dateKey = session.startTime.toISOString().split('T')[0];
        sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) || 0) + 1);
      });

      const dates = Array.from(sessionsByDate.keys()).sort().reverse();

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Check if user has sessions today or yesterday to maintain streak
      if (dates.includes(today) || dates.includes(yesterday)) {
        let streakDate = dates.includes(today) ? today : yesterday;
        let streakIndex = dates.indexOf(streakDate);

        while (streakIndex < dates.length) {
          const currentDate = new Date(dates[streakIndex]);
          const expectedDate = new Date(streakDate);
          expectedDate.setDate(expectedDate.getDate() - currentStreak);

          if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            currentStreak++;
            streakIndex++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;

      for (let i = 0; i < dates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const currentDate = new Date(dates[i]);
          const previousDate = new Date(dates[i - 1]);
          const dayDiff = Math.abs(currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return { currentStreak, longestStreak };
    } catch (error) {
      console.error('Error calculating streak:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  }

  /**
   * Count skills learned by user
   */
  private static async countSkillsLearned(userId: string): Promise<number> {
    try {
      const learningSessionsCount = await prisma.session.count({
        where: {
          OR: [
            { initiatorId: userId, sessionType: 'learning' },
            { partnerId: userId, sessionType: 'teaching' } // User was learning from a teacher
          ],
          status: 'completed'
        }
      });

      // This is a simplified count - in a real app, you'd track specific skills learned
      return Math.floor(learningSessionsCount / 5); // Assume 1 skill learned per 5 sessions
    } catch (error) {
      console.error('Error counting skills learned:', error);
      return 0;
    }
  }

  /**
   * Count skills taught by user
   */
  private static async countSkillsTaught(userId: string): Promise<number> {
    try {
      const teachingSessionsCount = await prisma.session.count({
        where: {
          OR: [
            { initiatorId: userId, sessionType: 'teaching' },
            { partnerId: userId, sessionType: 'learning' } // User was teaching a learner
          ],
          status: 'completed'
        }
      });

      // This is a simplified count - in a real app, you'd track specific skills taught
      return Math.floor(teachingSessionsCount / 3); // Assume 1 skill taught per 3 sessions
    } catch (error) {
      console.error('Error counting skills taught:', error);
      return 0;
    }
  }

  /**
   * Get user's session history with achievements context
   */
  static async getUserSessionHistory(userId: string, limit: number = 20): Promise<{
    sessions: any[];
    stats: SessionStats;
    recentAchievements: any[];
  }> {
    try {
      // Get recent sessions
      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { partnerId: userId }
          ],
          status: 'completed'
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          partner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        take: limit
      });

      // Get user stats
      const userStats = await prisma.userStats.findUnique({
        where: { userId }
      });

      // Get recent achievements (last 30 days)
      const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentAchievements = await prisma.userAchievement.findMany({
        where: {
          userId,
          earnedAt: {
            gte: recentThreshold
          }
        },
        include: {
          achievement: true
        },
        orderBy: {
          earnedAt: 'desc'
        },
        take: 10
      });

      const stats: SessionStats = {
        totalSessions: userStats?.totalSessions || 0,
        totalMinutesLearned: userStats?.totalMinutesLearned || 0,
        averageRating: userStats?.averageRating || 0,
        skillsLearned: userStats?.skillsLearned || 0,
        skillsTaught: userStats?.skillsTaught || 0,
        currentStreak: userStats?.currentStreak || 0,
        longestStreak: userStats?.longestStreak || 0,
        lastSessionDate: userStats?.lastSessionDate || new Date()
      };

      return {
        sessions,
        stats,
        recentAchievements
      };
    } catch (error) {
      console.error('Error getting user session history:', error);
      throw error;
    }
  }
}