import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { SessionService } from '@/services/session.service';

/**
 * POST /api/sessions/[sessionId]/complete - Complete a session and update stats
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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
    const { sessionId } = params;

    // Parse request body
    const body = await request.json();
    const {
      partnerId,
      durationMinutes,
      rating,
      feedback,
      topics = [],
      sessionType = 'learning'
    } = body;

    // Validate required fields
    if (!partnerId || !durationMinutes) {
      return NextResponse.json(
        { error: 'Missing required fields: partnerId, durationMinutes' },
        { status: 400 }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!['learning', 'teaching', 'collaboration'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type' },
        { status: 400 }
      );
    }

    // Complete the session
    const result = await SessionService.completeSession({
      sessionId,
      userId,
      partnerId,
      durationMinutes,
      rating,
      feedback,
      topics,
      sessionType
    });

    return NextResponse.json({
      success: true,
      session: result.session,
      newAchievements: result.newAchievements,
      updatedStats: result.updatedStats,
      message: result.newAchievements.length > 0
        ? `Session completed! You earned ${result.newAchievements.length} new achievement(s)!`
        : 'Session completed successfully!'
    });
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}