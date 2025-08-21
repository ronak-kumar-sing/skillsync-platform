import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware } from '@/lib/middleware';
import { SecureRequestValidator, SecurityValidationSchemas } from '@/lib/input-validation';
import { AuthService } from '@/services/auth.service';
import { ProgressiveRateLimiter } from '@/lib/rate-limiter';
import { InputSanitizer, SessionSecurity } from '@/lib/security';
import { validateRequest } from '@/lib/validation';
import { loginSchema } from '@/lib/validation';

/**
 * Secure login endpoint with comprehensive security measures
 */
export const POST = SecurityMiddleware.createSecureAPIWrapper(
  async (request: NextRequest) => {
    try {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

      // Check for progressive rate limiting violations
      const progressiveCheck = await ProgressiveRateLimiter.checkProgressiveLimit(clientIP);
      if (!progressiveCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Account temporarily restricted',
            message: 'Too many failed attempts. Please try again later.',
            retryAfter: Math.ceil((progressiveCheck.resetTime - Date.now()) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((progressiveCheck.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = validateRequest(loginSchema, body);

      if (!validation.isValid) {
        // Record failed validation as a security violation
        await ProgressiveRateLimiter.recordViolation(clientIP);

        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.errors,
          },
          { status: 400 }
        );
      }

      const { email, password } = validation.data!;

      // Sanitize inputs (additional layer of protection)
      const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
      const sanitizedPassword = password.trim();

      // Attempt authentication
      const authResult = await AuthService.authenticate(sanitizedEmail, sanitizedPassword);

      if (!authResult.success) {
        // Record failed login attempt
        await ProgressiveRateLimiter.recordViolation(clientIP);

        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'Invalid email or password',
          },
          { status: 401 }
        );
      }

      // Generate session fingerprint for additional security
      const userAgent = request.headers.get('user-agent') || '';
      const sessionFingerprint = SessionSecurity.createSessionFingerprint(userAgent, clientIP);

      // Successful authentication
      return NextResponse.json(
        {
          success: true,
          user: {
            id: authResult.user!.id,
            email: authResult.user!.email,
            username: authResult.user!.username,
          },
          tokens: {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
          },
          sessionFingerprint,
        },
        {
          status: 200,
          headers: {
            // Set secure session cookie
            'Set-Cookie': `session=${authResult.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
          },
        }
      );

    } catch (error) {
      console.error('Secure login error:', error);

      return NextResponse.json(
        {
          error: 'Authentication service unavailable',
          message: 'Please try again later',
        },
        { status: 503 }
      );
    }
  },
  {
    requireAuth: false,
    rateLimitType: 'auth',
    validateInput: true,
    requireCSRF: false, // Login doesn't require CSRF token
    maxBodySize: 1024, // 1KB limit for login requests
    allowedMethods: ['POST'],
  }
);

// Disable other HTTP methods
export const GET = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });