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

    // Generate weekly progress data (last 8 weeks)
    const weeklyProgress = Array.from({ length: 8 }, (_, index) => {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - (index * 7));
      const weekString = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

      // Mock data with some variation
      const baseSessions = Math.max(0, totalSessionsThisWeek - index);
      const sessions = baseSessions + Math.floor(Math.random() * 3);
      const minutes = sessions * (45 + Math.floor(Math.random() * 30)); // 45-75 min per session
      const rating = 4.0 + Math.random(); // 4.0-5.0 rating

      return {
        week: weekString,
        sessions: Math.min(sessions, 10),
        minutes,
        rating: parseFloat(rating.toFixed(1))
      };
    }).reverse();

    // Generate skill breakdown data
    const skillBreakdown = userSkills.slice(0, 5).map(userSkill => ({
      skill: userSkill.skill.name,
      sessionsCount: weeklySessionsData.filter(session =>
        session.topics?.includes(userSkill.skill.name)
      ).length + Math.floor(Math.random() * 5),
      averageRating: 4.0 + Math.random(),
      hoursSpent: (Math.random() * 20) + 5, // 5-25 hours
      lastPracticed: weeklySessionsData
        .filter(session => session.topics?.includes(userSkill.skill.name))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]?.startTime ||
        new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));

    const analytics = {
      totalSessions: (userStats?.totalSessions || 0) + totalSessionsThisWeek,
      totalMinutesLearned: (userStats?.totalMinutesLearned || 0) + totalMinutesThisWeek,
      averageRating,
      skillsLearned: Math.floor(userSkills.length * 0.7), // 70% of skills are "learned"
      skillsTaught: Math.floor(userSkills.length * 0.3), // 30% of skills are "taught"
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0,
      weeklyProgress,
      skillBreakdown,
      monthlyGoals: {
        sessions: {
          target: weeklyGoal.target * 4, // Monthly = weekly * 4
          current: totalSessionsThisWeek * 4 // Approximate monthly based on current week
        },
        skills: {
          target: 3, // Learn 3 new skills per month
          current: skillsImproved
        },
        minutes: {
          target: 1200, // 20 hours per month
          current: totalMinutesThisWeek * 4 // Approximate monthly
        }
      }
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