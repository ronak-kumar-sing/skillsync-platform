import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { AchievementService, LeaderboardFilters } from '@/services/achievement.service';

/**
 * GET /api/leaderboard - Get leaderboard with filtering options
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
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = (searchParams.get('category') || 'overall') as LeaderboardFilters['category'];
    const timeframe = searchParams.get('timeframe') as LeaderboardFilters['timeframe'];
    const skillId = searchParams.get('skillId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate parameters
    if (!['overall', 'weekly', 'monthly', 'skill_specific'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category parameter' },
        { status: 400 }
      );
    }

    if (timeframe && !['week', 'month', 'all_time'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe parameter' },
        { status: 400 }
      );
    }

    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    const filters: LeaderboardFilters = {
      category,
      timeframe,
      skillId
    };

    // Get leaderboard
    const leaderboard = await AchievementService.getLeaderboard(filters, limit, offset);

    // Find user's rank if not in the returned entries
    let userRank = leaderboard.entries.find(entry => entry.userId === userId)?.rank;

    if (!userRank) {
      // User is not in the current page, we'd need to calculate their rank
      // For now, we'll leave it undefined
      userRank = undefined;
    }

    return NextResponse.json({
      success: true,
      entries: leaderboard.entries,
      total: leaderboard.total,
      userRank,
      filters
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}