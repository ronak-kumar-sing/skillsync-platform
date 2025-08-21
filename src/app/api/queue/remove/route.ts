import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * POST /api/queue/remove - Remove user from matching queue
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // In a real implementation, this would remove from Redis queue
    console.log('Removing user from queue:', userId);

    return NextResponse.json({
      success: true,
      message: 'Removed from queue'
    });
  } catch (error) {
    console.error('Error removing from queue:', error);
    return NextResponse.json(
      { error: 'Failed to remove from queue' },
      { status: 500 }
    );
  }
}
