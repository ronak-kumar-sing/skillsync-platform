import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { passwordResetRequestSchema, validateRequest } from '@/lib/validation';
import { rateLimitMiddleware, getClientIP, sanitizeRequestBody, securityHeadersMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - very strict for password reset
    const clientIP = getClientIP(request);
    if (!rateLimitMiddleware(`password-reset:${clientIP}`, 3, 3600000)) { // 3 attempts per hour
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const body = sanitizeRequestBody(rawBody);

    // Validate request data
    const validation = validateRequest(passwordResetRequestSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Request password reset
    const result = await AuthService.requestPasswordReset(validation.data!);

    // Create response with security headers
    const response = NextResponse.json(
      {
        success: true,
        message: result.message
      },
      { status: 200 }
    );

    // Add security headers
    const securityHeaders = securityHeadersMiddleware();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Password reset request error:', error);

    // Always return the same message for security (don't reveal if user exists)
    return NextResponse.json(
      { message: 'If an account with this email exists, a password reset link has been sent.' },
      { status: 200 }
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