import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { validateRequest, addSkillSchema } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/middleware';
import { AddSkillRequest } from '@/types';

/**
 * GET /api/profile/skills - Get available skills
 */
export async function GET() {
  try {
    const skills = await ProfileService.getAvailableSkills();

    return NextResponse.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('Skills fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/skills - Add skill to user profile
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
    const validation = validateRequest<AddSkillRequest>(addSkillSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await ProfileService.addSkill(authResult.user.id, validation.data!);

    return NextResponse.json({
      success: true,
      message: 'Skill added successfully',
    });
  } catch (error) {
    console.error('Add skill error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add skill' },
      { status: 500 }
    );
  }
}