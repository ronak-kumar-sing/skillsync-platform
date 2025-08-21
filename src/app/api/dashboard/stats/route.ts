import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/stats - Get comprehensive dashboard statistics
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

    // Get platform-wide statistics
    const [
      totalUsers,
      activeUsers,
      totalSessions,
      averageRating,
      totalSkillsLearned,
      recentSessions
    ] = await Promise.all([
      // Total registered users
      prisma.user.count({
        where: { isActive: true }
      }),

      // Active users (logged in within last 24 hours)
      prisma.user.count({
        where: {
          isActive: true,
          lastActive: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Total completed sessions
      prisma.session.count({
        where: {
          endTime: { not: null }
        }
      }),

      // Average session rating
      prisma.session.aggregate({
        _avg: {
          ratingInitiator: true,
          ratingPartner: true
        },
        where: {
          endTime: { not: null },
          OR: [
            { ratingInitiator: { not: null } },
            { ratingPartner: { not: null } }
          ]
        }
      }),

      // Total unique skills learned
      prisma.userSkill.count(),

      // Recent sessions for match success rate calculation
      prisma.session.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          endTime: true,
          ratingInitiator: true,
          ratingPartner: true
        }
      })
    ]);

    // Calculate average rating from both initiator and partner ratings
    const avgInitiator = averageRating._avg.ratingInitiator || 0;
    const avgPartner = averageRating._avg.ratingPartner || 0;
    const combinedAverage = (avgInitiator + avgPartner) / 2;

    // Calculate match success rate (sessions that completed vs total sessions)
    const completedSessions = recentSessions.filter(s => s.endTime !== null).length;
    const matchSuccessRate = recentSessions.length > 0
      ? (completedSessions / recentSessions.length) * 100
      : 95; // Default fallback

    const stats = {
      totalUsers,
      activeUsers,
      totalSessions,
      averageRating: combinedAverage,
      matchSuccessRate,
      totalSkillsLearned,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}