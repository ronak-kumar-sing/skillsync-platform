import prisma from '@/lib/prisma';
import { Achievement, UserAchievement, UserStats } from '@/types';

export interface AchievementCriteria {
  type: 'session_count' | 'streak' | 'skill_level' | 'rating' | 'minutes_learned' | 'teaching_sessions' | 'collaboration_sessions';
  threshold: number;
  skillId?: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  change: number; // Position change from previous period
}

export interface LeaderboardFilters {
  category: 'overall' | 'weekly' | 'monthly' | 'skill_specific';
  skillId?: string;
  timeframe?: 'week' | 'month' | 'all_time';
}

export class AchievementService {
  /**
   * Check and award achievements for a user after a session
   */
  static async checkAndAwardAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      // Get user stats
      const userStats = await prisma.userStats.findUnique({
        where: { userId }
      });

      if (!userStats) {
        throw new Error('User stats not found');
      }

      // Get all achievements
      const allAchievements = await prisma.achievement.findMany();

      // Get user's existing achievements
      const existingAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true }
      });

      const existingAchievementIds = new Set(existingAchievements.map(ua => ua.achievementId));
      const newAchievements: UserAchievement[] = [];

      // Check each achievement
      for (const achievement of allAchievements) {
        if (existingAchievementIds.has(achievement.id)) {
          continue; // User already has this achievement
        }

        const criteria = achievement.criteria as AchievementCriteria;
        const isEarned = await this.checkAchievementCriteria(userId, criteria, userStats);

        if (isEarned) {
          // Award the achievement
          const userAchievement = await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              earnedAt: new Date()
            },
            include: {
              achievement: true
            }
          });

          // Update user's achievement points
          await prisma.userStats.update({
            where: { userId },
            data: {
              achievementPoints: {
                increment: achievement.points
              }
            }
          });

          newAchievements.push(userAchievement as UserAchievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw error;
    }
  }

  /**
   * Check if a user meets the criteria for an achievement
   */
  private static async checkAchievementCriteria(
    userId: string,
    criteria: AchievementCriteria,
    userStats: any
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'session_count':
        return userStats.totalSessions >= criteria.threshold;

      case 'streak':
        return userStats.currentStreak >= criteria.threshold;

      case 'minutes_learned':
        return userStats.totalMinutesLearned >= criteria.threshold;

      case 'rating':
        return userStats.averageRating && userStats.averageRating >= criteria.threshold;

      case 'skill_level':
        if (!criteria.skillId) return false;
        const userSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId,
              skillId: criteria.skillId
            }
          }
        });
        return userSkill ? userSkill.proficiencyLevel >= criteria.threshold : false;

      case 'teaching_sessions':
        const teachingSessions = await prisma.session.count({
          where: {
            initiatorId: userId,
            sessionType: 'teaching',
            status: 'completed'
          }
        });
        return teachingSessions >= criteria.threshold;

      case 'collaboration_sessions':
        const collabSessions = await prisma.session.count({
          where: {
            OR: [
              { initiatorId: userId },
              { partnerId: userId }
            ],
            sessionType: 'collaboration',
            status: 'completed'
          }
        });
        return collabSessions >= criteria.threshold;

      default:
        return false;
    }
  }

  /**
   * Get user's achievements with progress tracking
   */
  static async getUserAchievements(userId: string): Promise<{
    earned: UserAchievement[];
    inProgress: Array<Achievement & { progress: number; progressText: string }>;
  }> {
    try {
      // Get earned achievements
      const earnedAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });

      // Get all achievements not yet earned
      const earnedIds = earnedAchievements.map(ua => ua.achievementId);
      const availableAchievements = await prisma.achievement.findMany({
        where: {
          id: {
            notIn: earnedIds
          }
        }
      });

      // Get user stats for progress calculation
      const userStats = await prisma.userStats.findUnique({
        where: { userId }
      });

      if (!userStats) {
        throw new Error('User stats not found');
      }

      // Calculate progress for available achievements
      const inProgress = await Promise.all(
        availableAchievements.map(async (achievement) => {
          const criteria = achievement.criteria as AchievementCriteria;
          const progress = await this.calculateAchievementProgress(userId, criteria, userStats);

          return {
            ...achievement,
            progress: Math.min(progress.percentage, 100),
            progressText: progress.text
          };
        })
      );

      // Sort in-progress achievements by progress (highest first)
      inProgress.sort((a, b) => b.progress - a.progress);

      return {
        earned: earnedAchievements as UserAchievement[],
        inProgress: inProgress.slice(0, 10) // Show top 10 closest achievements
      };
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Calculate progress towards an achievement
   */
  private static async calculateAchievementProgress(
    userId: string,
    criteria: AchievementCriteria,
    userStats: any
  ): Promise<{ percentage: number; text: string }> {
    let current = 0;
    let target = criteria.threshold;
    let unit = '';

    switch (criteria.type) {
      case 'session_count':
        current = userStats.totalSessions;
        unit = 'sessions';
        break;

      case 'streak':
        current = userStats.currentStreak;
        unit = 'days';
        break;

      case 'minutes_learned':
        current = userStats.totalMinutesLearned;
        unit = 'minutes';
        break;

      case 'rating':
        current = userStats.averageRating || 0;
        unit = 'rating';
        break;

      case 'skill_level':
        if (criteria.skillId) {
          const userSkill = await prisma.userSkill.findUnique({
            where: {
              userId_skillId: {
                userId,
                skillId: criteria.skillId
              }
            }
          });
          current = userSkill ? userSkill.proficiencyLevel : 0;
          unit = 'level';
        }
        break;

      case 'teaching_sessions':
        current = await prisma.session.count({
          where: {
            initiatorId: userId,
            sessionType: 'teaching',
            status: 'completed'
          }
        });
        unit = 'teaching sessions';
        break;

      case 'collaboration_sessions':
        current = await prisma.session.count({
          where: {
            OR: [
              { initiatorId: userId },
              { partnerId: userId }
            ],
            sessionType: 'collaboration',
            status: 'completed'
          }
        });
        unit = 'collaboration sessions';
        break;
    }

    const percentage = (current / target) * 100;
    const text = `${current}/${target} ${unit}`;

    return { percentage, text };
  }

  /**
   * Get leaderboard with filtering options
   */
  static async getLeaderboard(
    filters: LeaderboardFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    entries: LeaderboardEntry[];
    total: number;
    userRank?: number;
    currentUserId?: string;
  }> {
    try {
      let whereClause: any = {};
      let orderBy: any = {};

      // Apply time-based filtering
      if (filters.timeframe && filters.timeframe !== 'all_time') {
        const now = new Date();
        let startDate: Date;

        if (filters.timeframe === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (filters.timeframe === 'month') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(0); // All time
        }

        whereClause.updatedAt = {
          gte: startDate
        };
      }

      // Determine scoring method based on category
      switch (filters.category) {
        case 'overall':
          orderBy = { achievementPoints: 'desc' };
          break;
        case 'weekly':
          // For weekly, we'll use a combination of recent activity
          orderBy = [
            { totalSessions: 'desc' },
            { achievementPoints: 'desc' }
          ];
          break;
        case 'monthly':
          orderBy = [
            { totalMinutesLearned: 'desc' },
            { achievementPoints: 'desc' }
          ];
          break;
        case 'skill_specific':
          if (filters.skillId) {
            // This would require a more complex query joining with user_skills
            // For now, we'll fall back to overall ranking
            orderBy = { achievementPoints: 'desc' };
          }
          break;
      }

      // Get leaderboard entries
      const userStats = await prisma.userStats.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      });

      // Calculate scores based on category
      const entries: LeaderboardEntry[] = userStats.map((stats, index) => {
        let score = 0;

        switch (filters.category) {
          case 'overall':
            score = stats.achievementPoints;
            break;
          case 'weekly':
            score = stats.totalSessions * 10 + stats.achievementPoints;
            break;
          case 'monthly':
            score = Math.floor(stats.totalMinutesLearned / 60) * 5 + stats.achievementPoints;
            break;
          default:
            score = stats.achievementPoints;
        }

        return {
          userId: stats.user.id,
          username: stats.user.username,
          avatarUrl: stats.user.avatarUrl || undefined,
          score,
          rank: offset + index + 1,
          change: 0 // TODO: Implement rank change tracking
        };
      });

      // Get total count
      const total = await prisma.userStats.count({ where: whereClause });

      return {
        entries,
        total
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get achievement statistics
   */
  static async getAchievementStats(): Promise<{
    totalAchievements: number;
    totalPointsAwarded: number;
    mostEarnedAchievement: Achievement & { earnedCount: number };
    rareAchievements: Achievement[];
  }> {
    try {
      const totalAchievements = await prisma.achievement.count();

      const totalPointsAwarded = await prisma.userStats.aggregate({
        _sum: {
          achievementPoints: true
        }
      });

      // Get most earned achievement
      const achievementCounts = await prisma.userAchievement.groupBy({
        by: ['achievementId'],
        _count: {
          achievementId: true
        },
        orderBy: {
          _count: {
            achievementId: 'desc'
          }
        },
        take: 1
      });

      let mostEarnedAchievement = null;
      if (achievementCounts.length > 0) {
        const achievement = await prisma.achievement.findUnique({
          where: { id: achievementCounts[0].achievementId }
        });
        if (achievement) {
          mostEarnedAchievement = {
            ...achievement,
            earnedCount: achievementCounts[0]._count.achievementId
          };
        }
      }

      // Get rare achievements (legendary and epic)
      const rareAchievements = await prisma.achievement.findMany({
        where: {
          rarity: {
            in: ['legendary', 'epic']
          }
        },
        orderBy: {
          points: 'desc'
        }
      });

      return {
        totalAchievements,
        totalPointsAwarded: totalPointsAwarded._sum.achievementPoints || 0,
        mostEarnedAchievement: mostEarnedAchievement as any,
        rareAchievements
      };
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      throw error;
    }
  }
}