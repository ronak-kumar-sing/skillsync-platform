import { NextRequest, NextResponse } from 'next/server';
import { QueueManagerService } from '@/services/queue-manager.service';
import { MatchingService } from '@/services/matching.service';
import { validateMatchingRequest } from '@/lib/matching-config';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/matching/queue - Join the matching queue
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const matchingRequest = {
      userId: decoded.userId,
      preferredSkills: body.preferredSkills || [],
      sessionType: body.sessionType,
      maxDuration: body.maxDuration || 60,
      urgency: body.urgency || 'medium',
    };

    // Validate request
    const validation = validateMatchingRequest(matchingRequest);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Add to queue and get status
    const queueStatus = await QueueManagerService.addToQueue(matchingRequest);

    return NextResponse.json({
      success: true,
      queueStatus,
      message: 'Successfully joined matching queue',
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json(
      { error: 'Failed to join queue' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/matching/queue - Leave the matching queue
 */
export async function DELETE(request: NextRequest) {
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

    await QueueManagerService.removeFromQueue(decoded.userId);

    return NextResponse.json({
      success: true,
      message: 'Successfully left matching queue',
    });
  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json(
      { error: 'Failed to leave queue' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/matching/queue - Get queue status for current user
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

    try {
      const queueStatus = await QueueManagerService.getQueueStatus(decoded.userId);
      return NextResponse.json({
        success: true,
        queueStatus,
        inQueue: true,
      });
    } catch (error) {
      // User not in queue
      return NextResponse.json({
        success: true,
        queueStatus: null,
        inQueue: false,
      });
    }
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}