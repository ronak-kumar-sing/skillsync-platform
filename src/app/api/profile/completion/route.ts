import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { verifyAuthToken } from '@/lib/middleware';

/**
 * GET /api/profile/completion - Get profile completion status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const completionStatus = await ProfileService.getProfileCompletionStatus(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: completionStatus,
    });
  } catch (error) {
    console.error('Profile completion status error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get profile completion status' },
      { status: 500 }
    );
  }
}