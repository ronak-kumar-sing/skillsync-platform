import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { SessionAnalyticsService } from '@/services/session-analytics.service';

/**
 * GET /api/sessions/analytics - Get comprehensive session analytics for a user
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
    const timeframe = searchParams.get('timeframe') || '30d'; // 7d, 30d, 90d, 1y, all
    const includeInsights = searchParams.get('insights') === 'true';
    const includeProgression = searchParams.get('progression') === 'true';

    // Get analytics data
    const analytics = await SessionAnalyticsService.getUserAnalytics(userId, {
      timeframe,
      includeInsights,
      includeProgression
    });

    return NextResponse.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}