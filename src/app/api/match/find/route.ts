import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { MatchingService } from '@/services/matching.service';

/**
 * POST /api/match/find - Find a match for the user
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
    const matchingRequest = body;

    // Validate request
    if (!matchingRequest.userId || !matchingRequest.preferredSkills || !matchingRequest.sessionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use the matching service to find a match
    const matchResult = await MatchingService.findMatch(matchingRequest);

    if (matchResult) {
      // Generate a session ID (in a real implementation, this would create a session record)
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return NextResponse.json({
        success: true,
        match: {
          partnerId: matchResult.partnerId,
          compatibilityScore: matchResult.compatibilityScore,
          scoreBreakdown: matchResult.scoreBreakdown,
          sessionId
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        match: null,
        message: 'No suitable match found at this time'
      });
    }
  } catch (error) {
    console.error('Error finding match:', error);
    return NextResponse.json(
      { error: 'Failed to find match' },
      { status: 500 }
    );
  }
}
