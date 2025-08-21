import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { SessionAnalyticsService } from '@/services/session-analytics.service';

/**
 * GET /api/sessions/insights - Get personalized learning insights
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
    const type = searchParams.get('type') || 'all'; // all, performance, patterns, recommendations

    // Get personalized insights
    const insights = await SessionAnalyticsService.generatePersonalizedInsights(userId, type);

    return NextResponse.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}