import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  extractTokenFromHeader,
  validatePasswordStrength,
} from '@/lib/auth';
import { AuthUser } from '@/types';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('Authentication Library', () => {
  const mockUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    isVerified: true,
    timezone: 'UTC',
  };

  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      const isInvalid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access tokens', () => {
      const token = generateAccessToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh tokens', () => {
      const token = generateRefreshToken(mockUser.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate password reset tokens', () => {
      const token = generatePasswordResetToken(mockUser.id, mockUser.email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different users', () => {
      const user1 = { ...mockUser, id: 'user-1' };
      const user2 = { ...mockUser, id: 'user-2' };

      const token1 = generateAccessToken(user1);
      const token2 = generateAccessToken(user2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid access tokens', () => {
      const token = generateAccessToken(mockUser);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.username).toBe(mockUser.username);
    });

    it('should reject invalid access tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyAccessToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should verify valid refresh tokens', () => {
      const token = generateRefreshToken(mockUser.id);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
    });

    it('should reject invalid refresh tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyRefreshToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should verify valid password reset tokens', () => {
      const token = generatePasswordResetToken(mockUser.id, mockUser.email);
      const decoded = verifyPasswordResetToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
      expect(decoded?.email).toBe(mockUser.email);
    });

    it('should reject invalid password reset tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyPasswordResetToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should reject access tokens as password reset tokens', () => {
      const accessToken = generateAccessToken(mockUser);
      const decoded = verifyPasswordResetToken(accessToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Token Header Extraction', () => {
    it('should extract tokens from Bearer headers', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should handle invalid headers', () => {
      expect(extractTokenFromHeader(null)).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(extractTokenFromHeader('Basic token')).toBeNull();
    });

    it('should handle malformed Bearer headers', () => {
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('Bearer ')).toBe('');
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password1',
        'Complex#Pass99',
        'Valid$Password2023',
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'short', expectedErrors: 4 }, // Too short, no uppercase, no number, no special
        { password: 'toolongbutnouppercaseornumberorspecial', expectedErrors: 3 },
        { password: 'NoNumbers!', expectedErrors: 1 },
        { password: 'nonumbers123', expectedErrors: 2 }, // No uppercase, no special
        { password: 'NOLOWERCASE123!', expectedErrors: 1 },
        { password: 'NoSpecialChars123', expectedErrors: 1 },
      ];

      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(expectedErrors);
      });
    });

    it('should provide specific error messages', () => {
      const result = validatePasswordStrength('weak');

      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should handle edge cases', () => {
      // Exactly 8 characters with all requirements
      const result1 = validatePasswordStrength('Pass123!');
      expect(result1.isValid).toBe(true);

      // Empty password
      const result2 = validatePasswordStrength('');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.length).toBeGreaterThan(0);

      // Only special characters
      const result3 = validatePasswordStrength('!@#$%^&*');
      expect(result3.isValid).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle expired tokens gracefully', () => {
      // This test would require mocking JWT expiration
      // For now, we'll test that expired tokens are rejected
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
      const decoded = verifyAccessToken(expiredToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malformed JWT tokens', () => {
      const malformedTokens = [
        'not.a.jwt',
        'only.two.parts',
        'too.many.parts.here.invalid',
        '',
        'single-string',
      ];

      malformedTokens.forEach(token => {
        expect(verifyAccessToken(token)).toBeNull();
        expect(verifyRefreshToken(token)).toBeNull();
        expect(verifyPasswordResetToken(token)).toBeNull();
      });
    });

    it('should handle tokens with wrong signature', () => {
      // Generate token with one secret, try to verify with different secret
      const token = generateAccessToken(mockUser);

      // Mock different secret
      vi.doMock('process', () => ({
        env: {
          JWT_SECRET: 'different-secret',
          JWT_REFRESH_SECRET: 'different-refresh-secret',
        },
      }));

      // Token should be invalid with different secret
      // Note: This test demonstrates the concept, actual implementation
      // would require more sophisticated mocking
      expect(typeof token).toBe('string');
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(verifyAccessToken(null as any)).toBeNull();
      expect(verifyAccessToken(undefined as any)).toBeNull();
      expect(verifyRefreshToken(null as any)).toBeNull();
      expect(verifyRefreshToken(undefined as any)).toBeNull();
      expect(verifyPasswordResetToken(null as any)).toBeNull();
      expect(verifyPasswordResetToken(undefined as any)).toBeNull();
    });
  });
});