import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth';
import { AuthService } from '@/services/auth.service';
import {
  createRateLimitMiddleware,
  UserRateLimiter,
  ProgressiveRateLimiter
} from '@/lib/rate-limiter';
import {
  InputSanitizer,
  CSRFProtection,
  SecurityHeaders,
  SessionSecurity
} from '@/lib/security';
import { SecureRequestValidator } from '@/lib/input-validation';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    username: string;
  };
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
  };
}

/**
 * Enhanced authentication middleware with security features
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Check for progressive rate limiting violations
    const clientIP = getClientIP(request);
    const progressiveCheck = await ProgressiveRateLimiter.checkProgressiveLimit(clientIP);

    if (!progressiveCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Account temporarily restricted',
          message: 'Too many security violations. Please try again later.',
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

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // Record failed authentication attempt
      await ProgressiveRateLimiter.recordViolation(clientIP);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: SecurityHeaders.additionalHeaders }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      // Record failed authentication attempt
      await ProgressiveRateLimiter.recordViolation(clientIP);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: SecurityHeaders.additionalHeaders }
      );
    }

    // Verify user still exists and is active
    const user = await AuthService.getUserById(decoded.userId);
    if (!user) {
      await ProgressiveRateLimiter.recordViolation(clientIP);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401, headers: SecurityHeaders.additionalHeaders }
      );
    }

    // Validate session fingerprint for additional security
    const userAgent = request.headers.get('user-agent') || '';
    const expectedFingerprint = SessionSecurity.createSessionFingerprint(userAgent, clientIP);
    const sessionFingerprint = request.headers.get('x-session-fingerprint');

    if (sessionFingerprint && sessionFingerprint !== expectedFingerprint) {
      console.warn('Session fingerprint mismatch detected', { userId: user.id, clientIP });
      // Don't block but log for monitoring
    }

    return null; // Continue to next middleware/handler
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401, headers: SecurityHeaders.additionalHeaders }
    );
  }
}

/**
 * Enhanced rate limiting middleware with user-specific limits
 */
export async function enhancedRateLimitMiddleware(
  request: NextRequest,
  limitType: 'auth' | 'api' | 'matching' | 'upload' = 'api'
): Promise<NextResponse | null> {
  try {
    const clientIP = getClientIP(request);

    // Apply IP-based rate limiting
    const ipRateLimit = createRateLimitMiddleware(limitType);
    const ipResult = await ipRateLimit(request);

    if (ipResult) {
      return ipResult; // Rate limit exceeded
    }

    // Apply user-specific rate limiting if authenticated
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const userLimit = await UserRateLimiter.checkUserRateLimit(
          decoded.userId,
          limitType === 'auth' ? 'api' : limitType as any
        );

        if (!userLimit.allowed) {
          return NextResponse.json(
            {
              error: 'User rate limit exceeded',
              message: 'Too many requests from your account',
              retryAfter: Math.ceil((userLimit.resetTime - Date.now()) / 1000)
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-User-Remaining': userLimit.remaining.toString(),
                'X-RateLimit-User-Reset': new Date(userLimit.resetTime).toISOString(),
                'Retry-After': Math.ceil((userLimit.resetTime - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      }
    }

    return null; // Continue to next middleware
  } catch (error) {
    console.error('Enhanced rate limiting error:', error);
    return null; // Allow request on error
  }
}

/**
 * CORS middleware
 */
export function corsMiddleware(request: NextRequest): NextResponse | null {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return null;
}

/**
 * Enhanced security headers middleware
 */
export function securityHeadersMiddleware(request: NextRequest): Record<string, string> {
  const headers = { ...SecurityHeaders.additionalHeaders };

  // Add CSP header
  const cspDirectives = Object.entries(SecurityHeaders.contentSecurityPolicy.directives)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${directive} ${Array.isArray(values) ? values.join(' ') : values}`;
    })
    .join('; ');

  headers['Content-Security-Policy'] = cspDirectives;

  // Add CSRF token header for authenticated requests
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const csrfToken = CSRFProtection.createTokenWithTimestamp();
    headers['X-CSRF-Token'] = csrfToken;
  }

  return headers;
}

/**
 * Helper function to get client IP for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return (request as any).ip || 'unknown';
}

/**
 * Enhanced input sanitization middleware
 */
export async function sanitizeAndValidateRequest(
  request: NextRequest,
  options: {
    requireCSRF?: boolean;
    maxBodySize?: number;
    allowedMethods?: string[];
  } = {}
): Promise<{
  isValid: boolean;
  sanitizedBody?: any;
  errors?: Record<string, string>;
  securityViolation?: string;
}> {
  try {
    // Basic request validation
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      return {
        isValid: false,
        securityViolation: `Method ${request.method} not allowed`
      };
    }

    // Content length check
    const contentLength = request.headers.get('content-length');
    const maxSize = options.maxBodySize || 1024 * 1024; // 1MB default

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        isValid: false,
        securityViolation: 'Request body too large'
      };
    }

    // Parse request body
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (error) {
      return {
        isValid: false,
        securityViolation: 'Invalid JSON format'
      };
    }

    // CSRF validation for state-changing operations
    if (options.requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token') || body._csrf;
      const sessionToken = request.headers.get('x-session-csrf');

      if (!csrfToken || !sessionToken || !CSRFProtection.validateToken(csrfToken, sessionToken)) {
        return {
          isValid: false,
          securityViolation: 'Invalid CSRF token'
        };
      }

      delete body._csrf; // Remove CSRF token from body
    }

    // Sanitize input
    const sanitizedBody = InputSanitizer.sanitizeInput(body);

    return {
      isValid: true,
      sanitizedBody
    };
  } catch (error) {
    console.error('Request sanitization error:', error);
    return {
      isValid: false,
      securityViolation: 'Request processing failed'
    };
  }
}

/**
 * Verify authentication token and return user data
 */
export async function verifyAuthToken(request: NextRequest): Promise<{ user: { id: string; email: string; username: string } } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return null;
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return null;
    }

    // Verify user still exists and is active
    const user = await AuthService.getUserById(decoded.userId);
    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
/**

 * Comprehensive security middleware composer
 */
export class SecurityMiddleware {
  /**
   * Apply all security middleware in the correct order
   */
  static async applySecurityMiddleware(
    request: NextRequest,
    options: {
      requireAuth?: boolean;
      requireCSRF?: boolean;
      rateLimitType?: 'auth' | 'api' | 'matching' | 'upload';
      maxBodySize?: number;
      allowedMethods?: string[];
      validateInput?: boolean;
    } = {}
  ): Promise<NextResponse | null> {
    try {
      // 1. Apply CORS headers
      const corsResponse = corsMiddleware(request);
      if (corsResponse) {
        return corsResponse;
      }

      // 2. Apply rate limiting
      if (options.rateLimitType) {
        const rateLimitResponse = await enhancedRateLimitMiddleware(request, options.rateLimitType);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // 3. Apply authentication if required
      if (options.requireAuth) {
        const authResponse = await authMiddleware(request);
        if (authResponse) {
          return authResponse;
        }
      }

      // 4. Validate and sanitize input
      if (options.validateInput && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validationResult = await sanitizeAndValidateRequest(request, {
          requireCSRF: options.requireCSRF,
          maxBodySize: options.maxBodySize,
          allowedMethods: options.allowedMethods,
        });

        if (!validationResult.isValid) {
          return NextResponse.json(
            {
              error: validationResult.securityViolation || 'Validation failed',
              details: validationResult.errors,
            },
            {
              status: validationResult.securityViolation ? 400 : 422,
              headers: SecurityHeaders.additionalHeaders,
            }
          );
        }
      }

      return null; // Continue to route handler
    } catch (error) {
      console.error('Security middleware error:', error);
      return NextResponse.json(
        { error: 'Security validation failed' },
        { status: 500, headers: SecurityHeaders.additionalHeaders }
      );
    }
  }

  /**
   * Create a security middleware wrapper for API routes
   */
  static createSecureAPIWrapper(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
    options: Parameters<typeof SecurityMiddleware.applySecurityMiddleware>[1] = {}
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      // Apply security middleware
      const securityResponse = await this.applySecurityMiddleware(request, options);
      if (securityResponse) {
        return securityResponse;
      }

      try {
        // Call the actual handler
        const response = await handler(request, context);

        // Add security headers to response
        const securityHeaders = securityHeadersMiddleware(request);
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      } catch (error) {
        console.error('API handler error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500, headers: SecurityHeaders.additionalHeaders }
        );
      }
    };
  }
}

/**
 * WebSocket security middleware
 */
export class WebSocketSecurity {
  /**
   * Validate WebSocket connection request
   */
  static validateWebSocketConnection(
    request: any,
    socket: any
  ): {
    allowed: boolean;
    reason?: string;
  } {
    try {
      // Check origin
      const origin = request.headers.origin;
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

      if (origin && !allowedOrigins.includes(origin)) {
        return {
          allowed: false,
          reason: 'Origin not allowed'
        };
      }

      // Check authentication token
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return {
          allowed: false,
          reason: 'Authentication required'
        };
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return {
          allowed: false,
          reason: 'Invalid token'
        };
      }

      // Rate limiting for WebSocket connections
      const clientIP = request.socket.remoteAddress;
      // This would integrate with the rate limiter

      return { allowed: true };
    } catch (error) {
      console.error('WebSocket security validation error:', error);
      return {
        allowed: false,
        reason: 'Security validation failed'
      };
    }
  }

  /**
   * Validate WebSocket message
   */
  static validateWebSocketMessage(message: any): {
    isValid: boolean;
    sanitizedMessage?: any;
    securityViolation?: string;
  } {
    try {
      // Check message size
      const messageStr = JSON.stringify(message);
      if (messageStr.length > 100000) { // 100KB limit
        return {
          isValid: false,
          securityViolation: 'Message too large'
        };
      }

      // Sanitize message content
      const sanitizedMessage = InputSanitizer.sanitizeInput(message);

      // Validate message structure
      if (!sanitizedMessage.type || typeof sanitizedMessage.type !== 'string') {
        return {
          isValid: false,
          securityViolation: 'Invalid message format'
        };
      }

      return {
        isValid: true,
        sanitizedMessage
      };
    } catch (error) {
      console.error('WebSocket message validation error:', error);
      return {
        isValid: false,
        securityViolation: 'Message validation failed'
      };
    }
  }
}

/**
 * File upload security middleware
 */
export class FileUploadSecurity {
  private static readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
  ];

  private static readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Validate uploaded file
   */
  static validateUploadedFile(file: {
    name: string;
    type: string;
    size: number;
    buffer?: Buffer;
  }): {
    isValid: boolean;
    errors?: string[];
    securityViolation?: string;
  } {
    const errors: string[] = [];

    // File size check
    if (file.size > this.maxFileSize) {
      errors.push('File size exceeds maximum allowed size');
    }

    // MIME type check
    if (!this.allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        securityViolation: 'File type not allowed'
      };
    }

    // Filename security check
    if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
      return {
        isValid: false,
        securityViolation: 'Filename contains unsafe characters'
      };
    }

    // File extension check
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        securityViolation: 'File extension not allowed'
      };
    }

    // Magic number validation
    if (file.buffer && file.buffer.length > 0) {
      const isValidMagicNumber = this.validateMagicNumber(file.buffer, file.type);
      if (!isValidMagicNumber) {
        return {
          isValid: false,
          securityViolation: 'File content does not match declared type'
        };
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate file magic number
   */
  private static validateMagicNumber(buffer: Buffer, mimeType: string): boolean {
    const magicNumbers: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    };

    const expectedMagic = magicNumbers[mimeType];
    if (!expectedMagic) {
      return true; // No magic number check for this type
    }

    if (buffer.length < expectedMagic.length) {
      return false;
    }

    for (let i = 0; i < expectedMagic.length; i++) {
      if (buffer[i] !== expectedMagic[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Scan file for malware (basic implementation)
   */
  static async scanFileForMalware(buffer: Buffer): Promise<{
    isSafe: boolean;
    threats?: string[];
  }> {
    // Basic malware detection patterns
    const malwarePatterns = [
      /eval\s*\(/gi,
      /<script[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
    ];

    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
    const threats: string[] = [];

    for (const pattern of malwarePatterns) {
      if (pattern.test(content)) {
        threats.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }

    return {
      isSafe: threats.length === 0,
      threats: threats.length > 0 ? threats : undefined
    };
  }
}