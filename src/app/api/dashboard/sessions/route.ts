import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/sessions - Get session metrics for dashboard
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

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get session metrics
    const [
      activeSessions,
      completedToday,
      averageDuration,
      topSkillsData
    ] = await Promise.all([
      // Currently active sessions
      prisma.session.count({
        where: {
          endTime: null,
          startTime: {
            gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // Sessions started within last 4 hours
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

      // Average session duration (in minutes)
      prisma.session.aggregate({
        _avg: {
          durationMinutes: true
        },
        where: {
          endTime: { not: null },
          durationMinutes: { not: null }
        }
      }),

      // Top skills practiced today (based on session topics)
      prisma.session.findMany({
        where: {
          startTime: {
            gte: todayStart
          },
          topics: {
            not: null
          }
        },
        select: {
          topics: true
        }
      })
    ]);

    // Process top skills from session topics
    const skillCounts: Record<string, number> = {};

    topSkillsData.forEach(session => {
      if (session.topics && Array.isArray(session.topics)) {
        session.topics.forEach((topic: string) => {
          skillCounts[topic] = (skillCounts[topic] || 0) + 1;
        });
      }
    });

    const topSkills = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const metrics = {
      activeSessions,
      completedToday,
      averageSessionDuration: averageDuration._avg.durationMinutes || 45, // Default fallback
      topSkills,
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error getting session metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get session metrics' },
      { status: 500 }
    );
  }
}