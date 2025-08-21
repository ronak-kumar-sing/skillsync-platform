import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth';
import { rateLimitMiddleware, getClientIP, sanitizeRequestBody, securityHeadersMiddleware } from '@/lib/middleware';
import Joi from 'joi';
import { validateRequest } from '@/lib/validation';

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
});

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimitMiddleware(`change-password:${clientIP}`, 5, 3600000)) { // 5 attempts per hour
      return NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Extract and verify token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const body = sanitizeRequestBody(rawBody);

    // Validate request data
    const validation = validateRequest(changePasswordSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Change password
    const result = await AuthService.changePassword(
      decoded.userId,
      validation.data!.currentPassword,
      validation.data!.newPassword
    );

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
    console.error('Change password error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Password change failed';

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
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}