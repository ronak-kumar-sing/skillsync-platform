import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { SessionAnalyticsService } from '@/services/session-analytics.service';

/**
 * POST /api/sessions/[sessionId]/feedback - Submit detailed session feedback
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
      rating,
      feedback,
      skillsLearned = [],
      skillsTaught = [],
      learningOutcomes = [],
      difficultyLevel,
      paceRating,
      communicationRating,
      technicalIssues = [],
      wouldRecommendPartner,
      improvementSuggestions,
      sharedResources = []
    } = body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Submit detailed feedback
    const result = await SessionAnalyticsService.submitDetailedFeedback(sessionId, userId, {
      rating,
      feedback,
      skillsLearned,
      skillsTaught,
      learningOutcomes,
      difficultyLevel,
      paceRating,
      communicationRating,
      technicalIssues,
      wouldRecommendPartner,
      improvementSuggestions,
      sharedResources
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[sessionId]/feedback - Get session feedback
 */
export async function GET(
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

    // Get session feedback
    const feedback = await SessionAnalyticsService.getSessionFeedback(sessionId, userId);

    return NextResponse.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}