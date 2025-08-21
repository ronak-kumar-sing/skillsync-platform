import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/analytics - Get user learning analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user analytics data
    const [
      userStats,
      weeklySessionsData,
      userSkills,
      weeklyGoal
    ] = await Promise.all([
      // User stats
      prisma.userStats.findUnique({
        where: { userId }
      }),

      // Sessions this week
      prisma.session.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { partnerId: userId }
          ],
          startTime: {
            gte: weekStart
          }
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          ratingInitiator: true,
          ratingPartner: true,
          initiatorId: true,
          topics: true
        }
      }),

      // User skills with recent activity
      prisma.userSkill.findMany({
        where: { userId },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),

      // Weekly learning goal (mock data for now)
      Promise.resolve({ target: 5, current: 0 }) // 5 sessions per week target
    ]);

    // Calculate weekly metrics
    const totalSessionsThisWeek = weeklySessionsData.length;
    const totalMinutesThisWeek = weeklySessionsData.reduce((sum, session) => {
      return sum + (session.durationMinutes || 0);
    }, 0);

    // Calculate average rating for user
    const userRatings = weeklySessionsData.map(session => {
      return session.initiatorId === userId
        ? session.ratingPartner
        : session.ratingInitiator;
    }).filter(rating => rating !== null);

    const averageRating = userRatings.length > 0
      ? userRatings.reduce((sum, rating) => sum + (rating || 0), 0) / userRatings.length
      : 0;

    // Calculate skills improved (mock calculation based on recent sessions)
    const skillsImproved = Math.min(userSkills.length, totalSessionsThisWeek);

    // Process skill progress
    const skillProgress = userSkills.slice(0, 5).map(userSkill => {
      // Mock progress calculation based on proficiency level and recent activity
      const baseProgress = (userSkill.proficiencyLevel - 1) * 25; // 0, 25, 50, 75, 100
      const sessionBonus = Math.min(20, totalSessionsThisWeek * 4); // Up to 20% bonus
      const progress = Math.min(100, baseProgress + sessionBonus);

      return {
        id: userSkill.id,
        name: userSkill.skill.name,
        category: userSkill.skill.category,
        currentLevel: userSkill.proficiencyLevel,
        targetLevel: Math.min(5, userSkill.proficiencyLevel + 1),
        progress,
        sessionsCount: weeklySessionsData.filter(session =>
          session.topics?.includes(userSkill.skill.name)
        ).length,
        lastPracticed: weeklySessionsData
          .filter(session => session.topics?.includes(userSkill.skill.name))
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]?.startTime
      };
    });

    // Calculate weekly goal progress
    const weeklyGoalProgress = weeklyGoal.target > 0
      ? Math.min(100, (totalSessionsThisWeek / weeklyGoal.target) * 100)
      : 0;

    const analytics = {
      totalSessionsThisWeek,
      totalMinutesThisWeek,
      averageRating,
      skillsImproved,
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0,
      weeklyGoalProgress,
      skillProgress,
    };

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get user analytics' },
      { status: 500 }
    );
  }
}