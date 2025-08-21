import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { validateRequest, createLearningGoalSchema } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/middleware';
import { CreateLearningGoalRequest } from '@/types';

/**
 * POST /api/profile/goals - Create a new learning goal
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateRequest<CreateLearningGoalRequest>(createLearningGoalSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await ProfileService.createLearningGoal(authResult.user.id, validation.data!);

    return NextResponse.json({
      success: true,
      message: 'Learning goal created successfully',
    });
  } catch (error) {
    console.error('Create learning goal error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create learning goal' },
      { status: 500 }
    );
  }
}