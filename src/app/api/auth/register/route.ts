import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { registerSchema, validateRequest } from '@/lib/validation';
import { rateLimitMiddleware, getClientIP, sanitizeRequestBody, securityHeadersMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimitMiddleware(`register:${clientIP}`, 3, 3600000)) { // 3 attempts per hour
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const body = sanitizeRequestBody(rawBody);

    // Validate request data
    const validation = validateRequest(registerSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Attempt registration
    const result = await AuthService.register(validation.data!);

    // Create response with security headers
    const response = NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Registration successful. Please check your email to verify your account.'
      },
      { status: 201 }
    );

    // Add security headers
    const securityHeaders = securityHeadersMiddleware(request);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Set HTTP-only cookie for refresh token (optional, more secure)
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Registration failed';

    // Return appropriate status code based on error type
    const statusCode = errorMessage.includes('already exists') || errorMessage.includes('already taken') ? 409 : 400;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
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