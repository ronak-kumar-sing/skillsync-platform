import * as crypto from 'crypto';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Data encryption utilities for data at rest
 */
export class DataEncryption {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;
  private static readonly ivLength = 16;
  private static readonly tagLength = 16;

  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return crypto.scryptSync(key, 'salt', this.keyLength);
  }

  /**
   * Encrypt sensitive data before storing in database
   */
  static encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv, tag, and encrypted data
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data when retrieving from database
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * Advanced input sanitization and XSS protection
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(dirty: string): string {
    return purify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
  }

  /**
   * Sanitize user input for database storage
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, 10000); // Limit length to prevent DoS
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Sanitize key names too
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);
        sanitized[cleanKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9@._-]/g, '')
      .substring(0, 254); // RFC 5321 limit
  }

  /**
   * Sanitize SQL-like inputs to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    return input
      .replace(/[';\\]/g, '') // Remove SQL injection characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments
      .replace(/\*\//g, '')
      .trim();
  }
}

/**
 * CSRF Token management
 */
export class CSRFProtection {
  private static readonly tokenLength = 32;
  private static readonly tokenExpiry = 3600000; // 1 hour in milliseconds

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  /**
   * Create CSRF token with timestamp
   */
  static createTokenWithTimestamp(): string {
    const token = this.generateToken();
    const timestamp = Date.now();
    return `${token}:${timestamp}`;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string, sessionToken: string): boolean {
    try {
      if (!token || !sessionToken) {
        return false;
      }

      const [sessionTokenValue, timestampStr] = sessionToken.split(':');

      if (!sessionTokenValue || !timestampStr) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      // Check if token has expired
      if (now - timestamp > this.tokenExpiry) {
        return false;
      }

      // Compare tokens using constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(sessionTokenValue, 'hex')
      );
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }
}

/**
 * Security headers configuration
 */
export const SecurityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Next.js
        "'unsafe-eval'", // Required for development
        "https://cdn.socket.io",
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
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "https:",
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // Additional security headers
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },
};

/**
 * WebRTC Security Configuration
 */
export class WebRTCSecurity {
  /**
   * Generate secure ICE server configuration
   */
  static getSecureICEServers(): RTCIceServer[] {
    return [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ],
      },
      {
        urls: process.env.TURN_SERVER_URL || 'turn:your-turn-server.com:3478',
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_PASSWORD || '',
      },
    ];
  }

  /**
   * Validate WebRTC signaling data
   */
  static validateSignalingData(data: any): boolean {
    try {
      // Validate SDP offer/answer
      if (data.type === 'offer' || data.type === 'answer') {
        return (
          typeof data.sdp === 'string' &&
          data.sdp.length > 0 &&
          data.sdp.length < 100000 // Reasonable SDP size limit
        );
      }

      // Validate ICE candidate
      if (data.candidate) {
        return (
          typeof data.candidate === 'string' &&
          typeof data.sdpMLineIndex === 'number' &&
          typeof data.sdpMid === 'string'
        );
      }

      return false;
    } catch (error) {
      console.error('WebRTC signaling validation error:', error);
      return false;
    }
  }

  /**
   * Generate secure room ID for WebRTC sessions
   */
  static generateSecureRoomId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Password security utilities
 */
export class PasswordSecurity {
  private static readonly minLength = 8;
  private static readonly maxLength = 128;

  /**
   * Comprehensive password strength validation
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.minLength) {
      feedback.push(`Password must be at least ${this.minLength} characters long`);
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    if (password.length > this.maxLength) {
      feedback.push(`Password must not exceed ${this.maxLength} characters`);
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Common password patterns
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password should not contain repeated characters');
      score -= 1;
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      feedback.push('Password should not contain common patterns');
      score -= 2;
    }

    const isValid = feedback.length === 0 && score >= 4;

    return {
      isValid,
      score: Math.max(0, Math.min(5, score)),
      feedback,
    };
  }

  /**
   * Check if password has been compromised (basic implementation)
   */
  static async checkPasswordCompromised(password: string): Promise<boolean> {
    // In a real implementation, you would check against a service like HaveIBeenPwned
    // For now, we'll just check against common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ];

    return commonPasswords.some(common =>
      password.toLowerCase().includes(common.toLowerCase())
    );
  }
}

/**
 * Session security utilities
 */
export class SessionSecurity {
  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate session data integrity
   */
  static validateSessionData(sessionData: any): boolean {
    try {
      return (
        sessionData &&
        typeof sessionData.userId === 'string' &&
        typeof sessionData.createdAt === 'number' &&
        Date.now() - sessionData.createdAt < 24 * 60 * 60 * 1000 // 24 hours
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create secure session fingerprint
   */
  static createSessionFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}:${ip}:${process.env.SESSION_SECRET || 'default-secret'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}