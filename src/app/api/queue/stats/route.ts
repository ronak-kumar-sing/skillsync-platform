import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * GET /api/queue/stats - Get queue statistics
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

    // Mock queue statistics (in a real implementation, this would come from Redis)
    const stats = {
      totalInQueue: Math.floor(Math.random() * 50) + 5,
      averageWaitTime: Math.floor(Math.random() * 10) + 2, // minutes
      successRate: 0.85 + Math.random() * 0.1, // 85-95%
      peakHours: [
        { hour: 9, count: 15 },
        { hour: 14, count: 22 },
        { hour: 18, count: 18 },
        { hour: 20, count: 12 }
      ]
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
