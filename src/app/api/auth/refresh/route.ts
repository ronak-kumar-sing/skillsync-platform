import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { refreshTokenSchema, validateRequest } from '@/lib/validation';
import { rateLimitMiddleware, getClientIP, sanitizeRequestBody, securityHeadersMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimitMiddleware(`refresh:${clientIP}`, 10, 300000)) { // 10 attempts per 5 minutes
      return NextResponse.json(
        { error: 'Too many refresh attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      const rawBody = await request.json();
      const body = sanitizeRequestBody(rawBody);

      const validation = validateRequest(refreshTokenSchema, body);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        );
      }

      refreshToken = validation.data!.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Attempt token refresh
    const result = await AuthService.refreshToken(refreshToken);

    // Create response with security headers
    const response = NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      },
      { status: 200 }
    );

    // Add security headers
    const securityHeaders = securityHeadersMiddleware();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Update HTTP-only cookie with new refresh token
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';

    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
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