import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/achievements/recent - Get user's recent achievements
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
    const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    // Get user's recent achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        earnedAt: {
          gte: recentThreshold
        }
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            iconUrl: true,
            category: true,
            points: true,
            rarity: true
          }
        }
      },
      orderBy: {
        earnedAt: 'desc'
      },
      take: 10 // Limit to 10 most recent
    });

    // Mark achievements earned in the last 7 days as "new"
    const newThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const achievements = userAchievements.map(userAchievement => ({
      id: userAchievement.achievement.id,
      name: userAchievement.achievement.name,
      description: userAchievement.achievement.description,
      iconUrl: userAchievement.achievement.iconUrl,
      category: userAchievement.achievement.category,
      points: userAchievement.achievement.points,
      rarity: userAchievement.achievement.rarity,
      earnedAt: userAchievement.earnedAt,
      isNew: userAchievement.earnedAt >= newThreshold
    }));

    return NextResponse.json({
      success: true,
      achievements,
    });
  } catch (error) {
    console.error('Error getting recent achievements:', error);
    return NextResponse.json(
      { error: 'Failed to get recent achievements' },
      { status: 500 }
    );
  }
}