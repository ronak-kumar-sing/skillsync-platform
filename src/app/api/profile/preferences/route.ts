import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profile.service';
import { validateRequest, updatePreferencesSchema } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/middleware';
import { UpdatePreferencesRequest } from '@/types';

/**
 * PUT /api/profile/preferences - Update user preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateRequest<UpdatePreferencesRequest>(updatePreferencesSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await ProfileService.updatePreferences(authResult.user.id, validation.data!);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update preferences error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}