import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { MatchingAnalytics } from '@/lib/matching-analytics';

/**
 * GET /api/matching/metrics - Get matching performance metrics
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

    // Get matching metrics using the analytics service
    const metrics = await MatchingAnalytics.getMatchingMetrics();

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting matching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get matching metrics' },
      { status: 500 }
    );
  }
}
