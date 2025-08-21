import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { AchievementService } from '@/services/achievement.service';

/**
 * GET /api/achievements/stats - Get achievement statistics
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

    // Get achievement statistics
    const stats = await AchievementService.getAchievementStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    return NextResponse.json(
      { error: 'Failed to get achievement stats' },
      { status: 500 }
    );
  }
}