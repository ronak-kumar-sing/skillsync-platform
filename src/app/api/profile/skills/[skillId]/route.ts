import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { validateRequest, updateSkillSchema } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/middleware';
import { UpdateSkillRequest } from '@/types';

/**
 * PUT /api/profile/skills/[skillId] - Update skill proficiency level
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await params;
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateRequest<UpdateSkillRequest>(updateSkillSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await ProfileService.updateSkill(authResult.user.id, skillId, validation.data!);

    return NextResponse.json({
      success: true,
      message: 'Skill updated successfully',
    });
  } catch (error) {
    console.error('Update skill error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/skills/[skillId] - Remove skill from profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await params;
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await ProfileService.removeSkill(authResult.user.id, skillId);

    return NextResponse.json({
      success: true,
      message: 'Skill removed successfully',
    });
  } catch (error) {
    console.error('Remove skill error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove skill' },
      { status: 500 }
    );
  }
}