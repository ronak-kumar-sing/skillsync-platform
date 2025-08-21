/**
 * Comprehensive security configuration for SkillSync platform
 */

export const SecurityConfig = {
  // Authentication settings
  auth: {
    // JWT settings
    jwt: {
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'skillsync-platform',
      audience: 'skillsync-users',
    },

    // Password requirements
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
    },

    // Session settings
    session: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const,
    },

    // Account lockout settings
    lockout: {
      maxFailedAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      progressiveLockout: true,
    },
  },

  // Rate limiting configuration
  rateLimiting: {
    // Global rate limits (per IP)
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },

    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: false,
    },

    // API endpoints
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: true,
    },

    // Matching requests
    matching: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
    },

    // File uploads
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
    },

    // WebSocket connections
    websocket: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
    },

    // User-specific limits
    userLimits: {
      api: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 200,
      },
      matching: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        maxRequests: 5,
      },
      sessions: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,
      },
    },
  },

  // Input validation settings
  validation: {
    // Request body limits
    maxBodySize: {
      default: 1024 * 1024, // 1MB
      upload: 10 * 1024 * 1024, // 10MB
      api: 100 * 1024, // 100KB
    },

    // String length limits
    stringLimits: {
      username: { min: 3, max: 30 },
      email: { max: 254 },
      password: { min: 8, max: 128 },
      message: { max: 10000 },
      filename: { max: 255 },
      description: { max: 1000 },
      title: { max: 200 },
    },

    // Array limits
    arrayLimits: {
      skills: { max: 50 },
      goals: { max: 20 },
      tags: { max: 10 },
      files: { max: 5 },
    },

    // Allowed file types
    allowedFileTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'text/plain'],
      maxSize: 10 * 1024 * 1024, // 10MB
    },
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        "'unsafe-eval'", // Required for development
        "https://cdn.socket.io",
        "https://unpkg.com", // For development tools
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CSS
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:", // For WebRTC video streams
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "https:",
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
        process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:3001",
      ],
      mediaSrc: [
        "'self'",
        "blob:", // For WebRTC media streams
      ],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },

  // Security headers
  headers: {
    // HSTS (HTTP Strict Transport Security)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Additional security headers
    additional: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    },
  },

  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Session-Fingerprint',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // WebRTC security settings
  webrtc: {
    // ICE server configuration
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ],
      },
      {
        urls: process.env.TURN_SERVER_URL || 'turn:localhost:3478',
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_PASSWORD || '',
      },
    ],

    // Connection constraints
    constraints: {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
      },
      optional: [
        { DtlsSrtpKeyAgreement: true },
      ],
    },

    // Security settings
    security: {
      requireEncryption: true,
      validateSignaling: true,
      maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours
      maxParticipants: 2, // Peer-to-peer limit
    },
  },

  // Data encryption settings
  encryption: {
    // Encryption algorithm
    algorithm: 'aes-256-gcm',

    // Key derivation settings
    keyDerivation: {
      algorithm: 'scrypt',
      saltLength: 32,
      keyLength: 32,
      cost: 16384,
      blockSize: 8,
      parallelization: 1,
    },

    // Fields that should be encrypted at rest
    encryptedFields: [
      'personalInfo.phone',
      'personalInfo.address',
      'preferences.privateNotes',
      'session.privateData',
    ],
  },

  // Monitoring and logging
  monitoring: {
    // Security events to log
    logEvents: [
      'failed_login',
      'account_lockout',
      'rate_limit_exceeded',
      'csrf_token_invalid',
      'suspicious_activity',
      'file_upload_rejected',
      'websocket_connection_rejected',
    ],

    // Alert thresholds
    alertThresholds: {
      failedLogins: 10, // per hour
      rateLimitViolations: 50, // per hour
      suspiciousActivity: 5, // per hour
    },

    // Data retention
    logRetention: {
      securityLogs: 90 * 24 * 60 * 60 * 1000, // 90 days
      auditLogs: 365 * 24 * 60 * 60 * 1000, // 1 year
      errorLogs: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  },

  // Environment-specific overrides
  environments: {
    development: {
      csp: {
        directives: {
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.socket.io",
            "http://localhost:*",
          ],
        },
      },
      cors: {
        origin: true, // Allow all origins in development
      },
      rateLimiting: {
        // More lenient rate limits for development
        auth: {
          maxRequests: 50,
        },
        api: {
          maxRequests: 1000,
        },
      },
    },

    production: {
      headers: {
        additional: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        },
      },
      csp: {
        directives: {
          upgradeInsecureRequests: [],
        },
      },
    },
  },
};

/**
 * Get environment-specific security configuration
 */
export function getSecurityConfig() {
  const baseConfig = SecurityConfig;
  const environment = process.env.NODE_ENV || 'development';

  if (environment === 'production' && SecurityConfig.environments.production) {
    // Merge production overrides
    return mergeDeep(baseConfig, SecurityConfig.environments.production);
  } else if (environment === 'development' && SecurityConfig.environments.development) {
    // Merge development overrides
    return mergeDeep(baseConfig, SecurityConfig.environments.development);
  }

  return baseConfig;
}

/**
 * Deep merge utility for configuration objects
 */
function mergeDeep(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate security configuration on startup
 */
export function validateSecurityConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate JWT secrets are strong enough
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY should be at least 32 characters long');
  }

  // Check CORS configuration in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    errors.push('ALLOWED_ORIGINS must be set in production');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}