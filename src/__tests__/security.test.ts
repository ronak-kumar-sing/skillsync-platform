import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock JSDOM for DOMPurify
vi.mock('jsdom', () => ({
  JSDOM: vi.fn(() => ({
    window: {
      document: {},
    },
  })),
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: vi.fn(() => ({
    sanitize: vi.fn((input: string) => input.replace(/<script[^>]*>.*?<\/script>/gi, '')),
  })),
}));

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    pipeline: vi.fn(() => ({
      zremrangebyscore: vi.fn(),
      zcard: vi.fn(),
      zadd: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn(() => Promise.resolve([[null, 0], [null, 1], [null, 1], [null, 1]])),
    })),
    get: vi.fn(() => Promise.resolve(null)),
    incr: vi.fn(() => Promise.resolve(1)),
    setex: vi.fn(() => Promise.resolve('OK')),
    del: vi.fn(() => Promise.resolve(1)),
    keys: vi.fn(() => Promise.resolve([])),
    ttl: vi.fn(() => Promise.resolve(-1)),
  })),
}));

import {
  DataEncryption,
  InputSanitizer,
  CSRFProtection,
  WebRTCSecurity,
  PasswordSecurity,
  SessionSecurity,
} from '@/lib/security';
import { RateLimiter, UserRateLimiter, ProgressiveRateLimiter } from '@/lib/rate-limiter';
import {
  SecureRequestValidator,
  SQLInjectionPrevention,
  NoSQLInjectionPrevention,
  CommandInjectionPrevention,
} from '@/lib/input-validation';
import {
  SecurityMiddleware,
  WebSocketSecurity,
  FileUploadSecurity,
} from '@/lib/middleware';

// Set up environment variables for testing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';

describe('Security Implementation Tests', () => {
  describe('DataEncryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalText = 'sensitive user data';
      const encrypted = DataEncryption.encrypt(originalText);
      const decrypted = DataEncryption.decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
      expect(encrypted).toContain(':'); // Should contain IV and tag separators
    });

    it('should generate secure random tokens', () => {
      const token1 = DataEncryption.generateSecureToken();
      const token2 = DataEncryption.generateSecureToken();

      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should hash data consistently', () => {
      const data = 'test data';
      const hash1 = DataEncryption.hash(data);
      const hash2 = DataEncryption.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('should fail to decrypt tampered data', () => {
      const originalText = 'sensitive data';
      const encrypted = DataEncryption.encrypt(originalText);
      const tampered = encrypted.replace('a', 'b'); // Tamper with encrypted data

      expect(() => DataEncryption.decrypt(tampered)).toThrow();
    });
  });

  describe('InputSanitizer', () => {
    it('should sanitize HTML content', () => {
      const dirty = '<script>alert("xss")</script><p>Safe content</p>';
      const clean = InputSanitizer.sanitizeHtml(dirty);

      expect(clean).not.toContain('<script>');
      expect(clean).toContain('Safe content');
    });

    it('should sanitize user input recursively', () => {
      const input = {
        username: '<script>alert("xss")</script>john',
        profile: {
          bio: 'javascript:alert("xss")',
          skills: ['<img onerror="alert(1)" src=x>', 'React'],
        },
      };

      const sanitized = InputSanitizer.sanitizeInput(input);

      expect(sanitized.username).not.toContain('<script>');
      expect(sanitized.profile.bio).not.toContain('javascript:');
      expect(sanitized.profile.skills[0]).not.toContain('onerror');
      expect(sanitized.profile.skills[1]).toBe('React');
    });

    it('should sanitize email addresses', () => {
      const email = 'TEST@EXAMPLE.COM<script>';
      const sanitized = InputSanitizer.sanitizeEmail(email);

      expect(sanitized).toBe('test@example.com');
    });

    it('should sanitize SQL input', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = InputSanitizer.sanitizeSqlInput(input);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('DROP');
    });
  });

  describe('CSRFProtection', () => {
    it('should generate valid CSRF tokens', () => {
      const token = CSRFProtection.generateToken();

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should create and validate timestamped tokens', () => {
      const tokenWithTimestamp = CSRFProtection.createTokenWithTimestamp();
      const [token] = tokenWithTimestamp.split(':');

      expect(tokenWithTimestamp).toContain(':');
      expect(CSRFProtection.validateToken(token, tokenWithTimestamp)).toBe(true);
    });

    it('should reject expired tokens', async () => {
      // Mock Date.now to simulate expired token
      const originalNow = Date.now;
      Date.now = vi.fn(() => 1000);

      const tokenWithTimestamp = CSRFProtection.createTokenWithTimestamp();

      // Fast forward time by 2 hours
      Date.now = vi.fn(() => 1000 + 2 * 60 * 60 * 1000);

      const [token] = tokenWithTimestamp.split(':');
      expect(CSRFProtection.validateToken(token, tokenWithTimestamp)).toBe(false);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should reject invalid tokens', () => {
      const validToken = CSRFProtection.createTokenWithTimestamp();
      const [token] = validToken.split(':');
      const invalidSessionToken = 'invalid:' + Date.now();

      expect(CSRFProtection.validateToken(token, invalidSessionToken)).toBe(false);
    });
  });

  describe('PasswordSecurity', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'StrongP@ssw0rd123';
      const result = PasswordSecurity.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPassword = 'weak';
      const result = PasswordSecurity.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should detect common password patterns', () => {
      const commonPassword = 'password123';
      const result = PasswordSecurity.validatePasswordStrength(commonPassword);

      expect(result.feedback).toContain('Password should not contain common patterns');
    });

    it('should detect repeated characters', () => {
      const repeatedPassword = 'Aaaa1111!';
      const result = PasswordSecurity.validatePasswordStrength(repeatedPassword);

      expect(result.feedback).toContain('Password should not contain repeated characters');
    });

    it('should check for compromised passwords', async () => {
      const compromisedPassword = 'password';
      const isCompromised = await PasswordSecurity.checkPasswordCompromised(compromisedPassword);

      expect(isCompromised).toBe(true);
    });
  });

  describe('WebRTCSecurity', () => {
    it('should provide secure ICE server configuration', () => {
      const iceServers = WebRTCSecurity.getSecureICEServers();

      expect(iceServers).toHaveLength(2);
      expect(iceServers[0].urls).toContain('stun:stun.l.google.com:19302');
      expect(iceServers[1]).toHaveProperty('username');
      expect(iceServers[1]).toHaveProperty('credential');
    });

    it('should validate WebRTC signaling data', () => {
      const validOffer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...',
      };

      const validCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      expect(WebRTCSecurity.validateSignalingData(validOffer)).toBe(true);
      expect(WebRTCSecurity.validateSignalingData(validCandidate)).toBe(true);
      expect(WebRTCSecurity.validateSignalingData({ invalid: 'data' })).toBe(false);
    });

    it('should generate secure room IDs', () => {
      const roomId1 = WebRTCSecurity.generateSecureRoomId();
      const roomId2 = WebRTCSecurity.generateSecureRoomId();

      expect(roomId1).toHaveLength(32);
      expect(roomId2).toHaveLength(32);
      expect(roomId1).not.toBe(roomId2);
    });
  });

  describe('SQLInjectionPrevention', () => {
    it('should detect SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      maliciousInputs.forEach(input => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(true);
      });
    });

    it('should allow safe SQL input', () => {
      const safeInputs = [
        'john.doe@example.com',
        'Regular search term',
        'Product name with spaces',
      ];

      safeInputs.forEach(input => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(false);
      });
    });

    it('should sanitize SQL input', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = SQLInjectionPrevention.sanitizeForSQL(maliciousInput);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('DROP');
    });
  });

  describe('NoSQLInjectionPrevention', () => {
    it('should sanitize MongoDB queries', () => {
      const maliciousQuery = {
        username: 'admin',
        password: { $ne: null },
        $where: 'this.username === "admin"',
      };

      const sanitized = NoSQLInjectionPrevention.sanitizeMongoQuery(maliciousQuery);

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toEqual({ $ne: null }); // $ne is allowed
      expect(sanitized.$where).toBeUndefined(); // $where is not allowed
    });

    it('should allow safe MongoDB operators', () => {
      const safeQuery = {
        age: { $gte: 18, $lt: 65 },
        skills: { $in: ['JavaScript', 'React'] },
        active: { $eq: true },
      };

      const sanitized = NoSQLInjectionPrevention.sanitizeMongoQuery(safeQuery);

      expect(sanitized).toEqual(safeQuery);
    });
  });

  describe('CommandInjectionPrevention', () => {
    it('should detect command injection patterns', () => {
      const maliciousInputs = [
        'file.txt; rm -rf /',
        'data | cat /etc/passwd',
        'input && shutdown -h now',
        'test `whoami`',
      ];

      maliciousInputs.forEach(input => {
        expect(CommandInjectionPrevention.containsCommandInjection(input)).toBe(true);
      });
    });

    it('should sanitize command input', () => {
      const maliciousInput = 'file.txt; rm -rf /';
      const sanitized = CommandInjectionPrevention.sanitizeForCommand(maliciousInput);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('rm');
    });
  });

  describe('FileUploadSecurity', () => {
    it('should validate safe file uploads', () => {
      const safeFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]), // PDF magic number
      };

      const result = FileUploadSecurity.validateUploadedFile(safeFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.securityViolation).toBeUndefined();
    });

    it('should reject unsafe file uploads', () => {
      const unsafeFile = {
        name: 'malicious<script>.exe',
        type: 'application/x-executable',
        size: 1024,
      };

      const result = FileUploadSecurity.validateUploadedFile(unsafeFile);

      expect(result.isValid).toBe(false);
      expect(result.securityViolation).toBeDefined();
    });

    it('should detect file type mismatch', () => {
      const mismatchedFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]), // PDF magic number
      };

      const result = FileUploadSecurity.validateUploadedFile(mismatchedFile);

      expect(result.isValid).toBe(false);
      expect(result.securityViolation).toContain('does not match declared type');
    });

    it('should scan for malware patterns', async () => {
      const maliciousContent = Buffer.from('<script>eval(maliciousCode)</script>');
      const result = await FileUploadSecurity.scanFileForMalware(maliciousContent);

      expect(result.isSafe).toBe(false);
      expect(result.threats).toBeDefined();
      expect(result.threats!.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(
        { windowMs: 60000, maxRequests: 5, skipSuccessfulRequests: false, skipFailedRequests: false },
        'test'
      );
    });

    it('should allow requests within limit', async () => {
      const result = await rateLimiter.checkRateLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.totalHits).toBe(1);
    });

    it('should block requests exceeding limit', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit('test-user');
      }

      // 6th request should be blocked
      const result = await rateLimiter.checkRateLimit('test-user');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset rate limit', async () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        await rateLimiter.checkRateLimit('test-user');
      }

      // Reset and try again
      await rateLimiter.resetRateLimit('test-user');
      const result = await rateLimiter.checkRateLimit('test-user');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Session Security', () => {
    it('should generate secure session IDs', () => {
      const sessionId1 = SessionSecurity.generateSessionId();
      const sessionId2 = SessionSecurity.generateSessionId();

      expect(sessionId1).toHaveLength(64);
      expect(sessionId2).toHaveLength(64);
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should validate session data', () => {
      const validSession = {
        userId: 'user-123',
        createdAt: Date.now(),
      };

      const invalidSession = {
        userId: 'user-123',
        createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      expect(SessionSecurity.validateSessionData(validSession)).toBe(true);
      expect(SessionSecurity.validateSessionData(invalidSession)).toBe(false);
    });

    it('should create consistent session fingerprints', () => {
      const userAgent = 'Mozilla/5.0 (Test Browser)';
      const ip = '192.168.1.1';

      const fingerprint1 = SessionSecurity.createSessionFingerprint(userAgent, ip);
      const fingerprint2 = SessionSecurity.createSessionFingerprint(userAgent, ip);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64);
    });
  });

  describe('WebSocket Security', () => {
    it('should validate WebSocket messages', () => {
      const validMessage = {
        type: 'chat',
        content: 'Hello world',
        timestamp: Date.now(),
      };

      const invalidMessage = {
        content: 'No type field',
      };

      const oversizedMessage = {
        type: 'data',
        content: 'x'.repeat(200000), // Too large
      };

      expect(WebSocketSecurity.validateWebSocketMessage(validMessage).isValid).toBe(true);
      expect(WebSocketSecurity.validateWebSocketMessage(invalidMessage).isValid).toBe(false);
      expect(WebSocketSecurity.validateWebSocketMessage(oversizedMessage).isValid).toBe(false);
    });

    it('should sanitize WebSocket messages', () => {
      const maliciousMessage = {
        type: 'chat',
        content: '<script>alert("xss")</script>Hello',
      };

      const result = WebSocketSecurity.validateWebSocketMessage(maliciousMessage);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedMessage?.content).not.toContain('<script>');
    });
  });
});

describe('Integration Tests', () => {
  describe('Security Middleware Integration', () => {
    it('should apply multiple security layers', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const result = await SecurityMiddleware.applySecurityMiddleware(mockRequest, {
        requireAuth: true,
        rateLimitType: 'api',
        validateInput: true,
      });

      // Should fail authentication
      expect(result).toBeDefined();
      expect(result!.status).toBe(401);
    });

    it('should create secure API wrapper', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'content-type': 'application/json' },
        })
      );

      const secureHandler = SecurityMiddleware.createSecureAPIWrapper(mockHandler, {
        rateLimitType: 'api',
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const response = await secureHandler(mockRequest);

      // Should add security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('End-to-End Security Flow', () => {
    it('should handle complete secure request flow', async () => {
      // This would test the complete flow from request to response
      // including rate limiting, authentication, validation, and response headers

      const mockRequest = new NextRequest('http://localhost:3000/api/profile', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'user-agent': 'Test Browser',
        },
      });

      // Mock the complete security flow
      const securityResult = await SecurityMiddleware.applySecurityMiddleware(mockRequest, {
        requireAuth: false, // Skip auth for this test
        rateLimitType: 'api',
      });

      // Should pass security checks
      expect(securityResult).toBeNull(); // null means continue to handler
    });
  });
});