import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Redis client for rate limiting
let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
  console.error('Redis connection failed for rate limiting:', error);
}

/**
 * Rate limiting configuration for different endpoints
 */
export const RateLimitConfig = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },

  // Matching requests
  matching: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 matching requests per 5 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // WebSocket connections
  websocket: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 connection attempts per minute
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },

  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 uploads per hour
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 password reset attempts per hour
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
} as const;

/**
 * Rate limiter class with Redis backend
 */
export class RateLimiter {
  private config: typeof RateLimitConfig[keyof typeof RateLimitConfig];
  private keyPrefix: string;

  constructor(
    config: typeof RateLimitConfig[keyof typeof RateLimitConfig],
    keyPrefix: string
  ) {
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = `rate_limit:${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      if (!redis) {
        // Fallback to in-memory rate limiting if Redis is not available
        return this.fallbackRateLimit(identifier);
      }

      // Use Redis sorted sets for sliding window rate limiting
      const pipeline = redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const totalHits = currentCount + 1;
      const remaining = Math.max(0, this.config.maxRequests - totalHits);
      const resetTime = now + this.config.windowMs;

      return {
        allowed: totalHits <= this.config.maxRequests,
        remaining,
        resetTime,
        totalHits,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Allow request on error to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        totalHits: 1,
      };
    }
  }

  /**
   * Fallback in-memory rate limiting when Redis is unavailable
   */
  private fallbackRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  } {
    // Simple in-memory fallback (not recommended for production)
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();

    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    const store = global.rateLimitStore as Map<string, { count: number; resetTime: number }>;
    const current = store.get(key);

    if (!current || current.resetTime < now) {
      store.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
        totalHits: 1,
      };
    }

    current.count++;
    const remaining = Math.max(0, this.config.maxRequests - current.count);

    return {
      allowed: current.count <= this.config.maxRequests,
      remaining,
      resetTime: current.resetTime,
      totalHits: current.count,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${this.keyPrefix}:${identifier}`;

    try {
      if (redis) {
        await redis.del(key);
      } else if (global.rateLimitStore) {
        (global.rateLimitStore as Map<string, any>).delete(`${this.keyPrefix}:${identifier}`);
      }
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }
}

/**
 * Create rate limiter middleware for Next.js API routes
 */
export function createRateLimitMiddleware(
  configKey: keyof typeof RateLimitConfig,
  getIdentifier?: (request: NextRequest) => string
) {
  const limiter = new RateLimiter(RateLimitConfig[configKey], configKey);

  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Get identifier (IP address by default, or custom function)
      const identifier = getIdentifier
        ? getIdentifier(request)
        : getClientIP(request);

      const result = await limiter.checkRateLimit(identifier);

      // Add rate limit headers
      const headers = {
        'X-RateLimit-Limit': RateLimitConfig[configKey].maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      };

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again after ${new Date(result.resetTime).toISOString()}`,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              ...headers,
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            },
          }
        );
      }

      // Add headers to successful response (will be handled by the actual route handler)
      return null;
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Allow request on error
      return null;
    }
  };
}

/**
 * User-specific rate limiting (requires authentication)
 */
export class UserRateLimiter {
  private static readonly userLimits = {
    // Per-user API limits
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200, // 200 requests per minute per user
    },

    // Per-user matching limits
    matching: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 5, // 5 matching requests per 10 minutes per user
    },

    // Per-user session creation limits
    sessions: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 sessions per hour per user
    },
  };

  static async checkUserRateLimit(
    userId: string,
    limitType: keyof typeof UserRateLimiter.userLimits
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const config = this.userLimits[limitType];
    const limiter = new RateLimiter(config, `user_${limitType}`);

    const result = await limiter.checkRateLimit(userId);

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  }
}

/**
 * Progressive rate limiting (increases restrictions for repeated violations)
 */
export class ProgressiveRateLimiter {
  private static readonly violationKey = 'rate_limit_violations';

  static async checkProgressiveLimit(identifier: string): Promise<{
    allowed: boolean;
    penaltyLevel: number;
    resetTime: number;
  }> {
    try {
      if (!redis) {
        return { allowed: true, penaltyLevel: 0, resetTime: Date.now() };
      }

      const violationKey = `${this.violationKey}:${identifier}`;
      const violations = await redis.get(violationKey);
      const violationCount = violations ? parseInt(violations, 10) : 0;

      // Progressive penalties
      let penaltyMultiplier = 1;
      let penaltyDuration = 60 * 1000; // 1 minute base

      if (violationCount > 0) {
        penaltyMultiplier = Math.min(violationCount * 2, 10); // Max 10x penalty
        penaltyDuration = Math.min(penaltyDuration * penaltyMultiplier, 60 * 60 * 1000); // Max 1 hour
      }

      const penaltyKey = `penalty:${identifier}`;
      const penaltyExpiry = await redis.get(penaltyKey);

      if (penaltyExpiry && Date.now() < parseInt(penaltyExpiry, 10)) {
        return {
          allowed: false,
          penaltyLevel: violationCount,
          resetTime: parseInt(penaltyExpiry, 10),
        };
      }

      return {
        allowed: true,
        penaltyLevel: violationCount,
        resetTime: Date.now(),
      };
    } catch (error) {
      console.error('Progressive rate limiting error:', error);
      return { allowed: true, penaltyLevel: 0, resetTime: Date.now() };
    }
  }

  static async recordViolation(identifier: string): Promise<void> {
    try {
      if (!redis) return;

      const violationKey = `${this.violationKey}:${identifier}`;
      const penaltyKey = `penalty:${identifier}`;

      // Increment violation count
      const violations = await redis.incr(violationKey);
      await redis.expire(violationKey, 24 * 60 * 60); // Reset violations after 24 hours

      // Set penalty period
      const penaltyDuration = Math.min(violations * 2 * 60 * 1000, 60 * 60 * 1000); // Max 1 hour
      const penaltyExpiry = Date.now() + penaltyDuration;

      await redis.setex(penaltyKey, Math.ceil(penaltyDuration / 1000), penaltyExpiry.toString());
    } catch (error) {
      console.error('Violation recording error:', error);
    }
  }
}

/**
 * Helper function to get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;

  return 'unknown';
}

/**
 * Distributed rate limiting for multiple server instances
 */
export class DistributedRateLimiter {
  static async syncRateLimits(): Promise<void> {
    // Implementation for syncing rate limits across multiple server instances
    // This would be used in a distributed environment
    try {
      if (!redis) return;

      // Cleanup expired rate limit entries
      const pattern = 'rate_limit:*';
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no expiration, set a default expiration
          await redis.expire(key, 3600); // 1 hour default
        }
      }
    } catch (error) {
      console.error('Rate limit sync error:', error);
    }
  }
}