import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * POST /api/queue/add - Add user to matching queue
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

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, preferredSkills, sessionType, maxDuration, urgency } = body;

    // Validate request
    if (!userId || !preferredSkills || !sessionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real implementation, this would add to Redis queue
    console.log('Adding user to queue:', {
      userId,
      preferredSkills,
      sessionType,
      maxDuration,
      urgency,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Added to matching queue',
      queuePosition: Math.floor(Math.random() * 10) + 1
    });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json(
      { error: 'Failed to add to queue' },
      { status: 500 }
    );
  }
}
