import { PrismaClient } from '@prisma/client';
import { cache } from './cache';

export class QueryOptimizer {
  constructor(private prisma: PrismaClient) { }

  /**
   * Optimized user query with caching
   */
  async getUserWithCache(userId: string) {
    const cacheKey = `user:${userId}`;

    return cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
            timezone: true,
            isVerified: true,
            createdAt: true,
            lastActive: true,
            userSkills: {
              select: {
                proficiencyLevel: true,
                verified: true,
                endorsements: true,
                skill: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
            userAchievements: {
              select: {
                earnedAt: true,
                achievement: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    iconUrl: true,
                    category: true,
                    points: true,
                    rarity: true,
                  },
                },
              },
            },
          },
        });
      },
      { ttl: 1800 } // 30 minutes
    );
  }

  /**
   * Optimized skills query with caching
   */
  async getAllSkillsWithCache() {
    const cacheKey = 'skills:all';

    return cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.skill.findMany({
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            _count: {
              select: {
                userSkills: true,
              },
            },
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
        });
      },
      { ttl: 86400 } // 24 hours
    );
  }

  /**
   * Optimized leaderboard query with caching
   */
  async getLeaderboardWithCache(category: string, limit = 50) {
    const cacheKey = `leaderboard:${category}:${limit}`;

    return cache.getOrSet(
      cacheKey,
      async () => {
        const baseQuery = {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            userAchievements: {
              select: {
                achievement: {
                  select: {
                    points: true,
                    category: true,
                  },
                },
              },
            },
            sessions: {
              select: {
                duration: true,
                ratingInitiator: true,
                ratingPartner: true,
              },
              where: {
                endTime: {
                  not: null,
                },
              },
            },
          },
          take: limit,
        };

        if (category === 'overall') {
          return this.prisma.user.findMany({
            ...baseQuery,
            orderBy: {
              userAchievements: {
                _count: 'desc',
              },
            },
          });
        }

        return this.prisma.user.findMany({
          ...baseQuery,
          where: {
            userAchievements: {
              some: {
                achievement: {
                  category: category,
                },
              },
            },
          },
          orderBy: {
            userAchievements: {
              _count: 'desc',
            },
          },
        });
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Optimized session history query with pagination
   */
  async getSessionHistoryWithCache(
    userId: string,
    page = 1,
    limit = 20
  ) {
    const cacheKey = `sessions:user:${userId}:page:${page}:limit:${limit}`;

    return cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        return this.prisma.session.findMany({
          where: {
            OR: [
              { initiatorId: userId },
              { partnerId: userId },
            ],
            endTime: {
              not: null,
            },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            duration: true,
            sessionType: true,
            topics: true,
            ratingInitiator: true,
            ratingPartner: true,
            initiator: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
            partner: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            startTime: 'desc',
          },
          skip,
          take: limit,
        });
      },
      { ttl: 600 } // 10 minutes
    );
  }

  /**
   * Optimized matching candidates query
   */
  async getMatchingCandidatesOptimized(
    userId: string,
    preferredSkills: string[],
    sessionType: string
  ) {
    // Use raw query for complex matching logic
    const query = `
      SELECT DISTINCT u.id, u.username, u.avatar_url, u.timezone, u.last_active,
             array_agg(DISTINCT s.name) as skills,
             array_agg(DISTINCT us.proficiency_level) as skill_levels,
             COUNT(DISTINCT sess.id) as session_count,
             AVG(CASE
               WHEN sess.initiator_id = u.id THEN sess.rating_partner
               ELSE sess.rating_initiator
             END) as avg_rating
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN sessions sess ON (sess.initiator_id = u.id OR sess.partner_id = u.id)
        AND sess.end_time IS NOT NULL
      WHERE u.id != $1
        AND u.is_active = true
        AND u.last_active > NOW() - INTERVAL '7 days'
        AND s.name = ANY($2)
      GROUP BY u.id, u.username, u.avatar_url, u.timezone, u.last_active
      HAVING COUNT(DISTINCT s.name) > 0
      ORDER BY
        COUNT(DISTINCT s.name) DESC,
        AVG(CASE
          WHEN sess.initiator_id = u.id THEN sess.rating_partner
          ELSE sess.rating_initiator
        END) DESC NULLS LAST,
        u.last_active DESC
      LIMIT 50;
    `;

    return this.prisma.$queryRawUnsafe(query, userId, preferredSkills);
  }

  /**
   * Batch update user activity
   */
  async batchUpdateUserActivity(userIds: string[]) {
    if (userIds.length === 0) return;

    await this.prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        lastActive: new Date(),
      },
    });

    // Invalidate user caches
    const cacheKeys = userIds.map(id => `user:${id}`);
    await Promise.all(cacheKeys.map(key => cache.delete(key)));
  }

  /**
   * Optimized analytics query
   */
  async getAnalyticsWithCache(userId: string, timeRange: 'week' | 'month' | 'year') {
    const cacheKey = `analytics:${userId}:${timeRange}`;

    const timeRangeMap = {
      week: 7,
      month: 30,
      year: 365,
    };

    return cache.getOrSet(
      cacheKey,
      async () => {
        const days = timeRangeMap[timeRange];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [sessions, achievements, skillProgress] = await Promise.all([
          // Sessions analytics
          this.prisma.session.findMany({
            where: {
              OR: [
                { initiatorId: userId },
                { partnerId: userId },
              ],
              startTime: {
                gte: startDate,
              },
              endTime: {
                not: null,
              },
            },
            select: {
              duration: true,
              sessionType: true,
              startTime: true,
              ratingInitiator: true,
              ratingPartner: true,
            },
          }),

          // Achievements analytics
          this.prisma.userAchievement.findMany({
            where: {
              userId: userId,
              earnedAt: {
                gte: startDate,
              },
            },
            select: {
              earnedAt: true,
              achievement: {
                select: {
                  points: true,
                  category: true,
                },
              },
            },
          }),

          // Skill progress (simplified)
          this.prisma.userSkill.findMany({
            where: {
              userId: userId,
            },
            select: {
              proficiencyLevel: true,
              endorsements: true,
              skill: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
          }),
        ]);

        return {
          sessions,
          achievements,
          skillProgress,
          timeRange,
          generatedAt: new Date(),
        };
      },
      { ttl: 3600 } // 1 hour
    );
  }
}

export default QueryOptimizer;