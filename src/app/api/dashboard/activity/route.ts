import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/activity - Get platform activity feed
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

    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Get recent platform activities
    const [
      recentSessions,
      recentAchievements,
      recentUsers,
      recentSkillUpdates
    ] = await Promise.all([
      // Recent completed sessions
      prisma.session.findMany({
        where: {
          endTime: {
            gte: recentThreshold,
            not: null
          }
        },
        include: {
          initiator: {
            select: { username: true }
          },
          partner: {
            select: { username: true }
          }
        },
        orderBy: {
          endTime: 'desc'
        },
        take: 10
      }),

      // Recent achievements earned
      prisma.userAchievement.findMany({
        where: {
          earnedAt: {
            gte: recentThreshold
          }
        },
        include: {
          user: {
            select: { username: true }
          },
          achievement: {
            select: { name: true, category: true }
          }
        },
        orderBy: {
          earnedAt: 'desc'
        },
        take: 10
      }),

      // New users joined
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: recentThreshold
          },
          isActive: true
        },
        select: {
          id: true,
          username: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }),

      // Recent skill additions/updates
      prisma.userSkill.findMany({
        where: {
          createdAt: {
            gte: recentThreshold
          }
        },
        include: {
          user: {
            select: { username: true }
          },
          skill: {
            select: { name: true, category: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);

    // Combine and format activities
    const activities = [];

    // Add session activities
    recentSessions.forEach(session => {
      activities.push({
        id: `session_${session.id}`,
        type: 'session_completed',
        title: 'Learning Session Completed',
        description: `${session.initiator.username} and ${session.partner.username} completed a ${session.durationMinutes || 45}-minute session`,
        timestamp: session.endTime!,
        userId: session.initiatorId,
        username: session.initiator.username,
        metadata: {
          sessionDuration: session.durationMinutes,
          rating: session.ratingInitiator || session.ratingPartner,
          partnerName: session.partner.username
        }
      });
    });

    // Add achievement activities
    recentAchievements.forEach(userAchievement => {
      activities.push({
        id: `achievement_${userAchievement.id}`,
        type: 'achievement_earned',
        title: 'Achievement Unlocked',
        description: `${userAchievement.user.username} earned "${userAchievement.achievement.name}"`,
        timestamp: userAchievement.earnedAt,
        userId: userAchievement.userId,
        username: userAchievement.user.username,
        metadata: {
          achievementName: userAchievement.achievement.name
        }
      });
    });

    // Add new user activities
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_joined',
        title: 'New Member Joined',
        description: `${user.username} joined the SkillSync community`,
        timestamp: user.createdAt,
        userId: user.id,
        username: user.username,
        metadata: {}
      });
    });

    // Add skill improvement activities
    recentSkillUpdates.forEach(userSkill => {
      activities.push({
        id: `skill_${userSkill.id}`,
        type: 'skill_improved',
        title: 'Skill Added',
        description: `${userSkill.user.username} added ${userSkill.skill.name} to their profile`,
        timestamp: userSkill.createdAt,
        userId: userSkill.userId,
        username: userSkill.user.username,
        metadata: {
          skillName: userSkill.skill.name
        }
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Take only the most recent 20 activities
    const recentActivities = activities.slice(0, 20);

    return NextResponse.json({
      success: true,
      activities: recentActivities,
    });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to get activity feed' },
      { status: 500 }
    );
  }
}