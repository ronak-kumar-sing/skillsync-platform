import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { validateRequest, updateLearningGoalSchema } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/middleware';
import { UpdateLearningGoalRequest } from '@/types';

/**
 * PUT /api/profile/goals/[goalId] - Update a learning goal
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params;
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateRequest<UpdateLearningGoalRequest>(updateLearningGoalSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await ProfileService.updateLearningGoal(authResult.user.id, goalId, validation.data!);

    return NextResponse.json({
      success: true,
      message: 'Learning goal updated successfully',
    });
  } catch (error) {
    console.error('Update learning goal error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update learning goal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/goals/[goalId] - Delete a learning goal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params;
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await ProfileService.deleteLearningGoal(authResult.user.id, goalId);

    return NextResponse.json({
      success: true,
      message: 'Learning goal deleted successfully',
    });
  } catch (error) {
    console.error('Delete learning goal error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete learning goal' },
      { status: 500 }
    );
  }
}