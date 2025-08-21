import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { AchievementService } from '@/services/achievement.service';

/**
 * GET /api/achievements - Get user's achievements with progress
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

    // Get user's achievements
    const achievements = await AchievementService.getUserAchievements(userId);

    return NextResponse.json({
      success: true,
      ...achievements
    });
  } catch (error) {
    console.error('Error getting achievements:', error);
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    );
  }
}