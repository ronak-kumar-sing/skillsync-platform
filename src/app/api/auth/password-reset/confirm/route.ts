import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { passwordResetConfirmSchema, validateRequest } from '@/lib/validation';
import { rateLimitMiddleware, getClientIP, sanitizeRequestBody, securityHeadersMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimitMiddleware(`password-reset-confirm:${clientIP}`, 5, 3600000)) { // 5 attempts per hour
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const body = sanitizeRequestBody(rawBody);

    // Validate request data
    const validation = validateRequest(passwordResetConfirmSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Confirm password reset
    const result = await AuthService.confirmPasswordReset(validation.data!);

    // Create response with security headers
    const response = NextResponse.json(
      {
        success: true,
        message: result.message
      },
      { status: 200 }
    );

    // Add security headers
    const securityHeaders = securityHeadersMiddleware(request);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Password reset confirmation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}