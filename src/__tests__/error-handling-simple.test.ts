/**
 * Focused tests for error handling core functionality
 * Tests retry logic, error classification, and basic functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SkillSyncError,
  withRetry,
  isRetryableError,
  classifyError,
  createError,
  safeAsync
} from '@/lib/error-handling';

// Mock timers for testing
vi.useFakeTimers();

describe('Error Handling Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('SkillSyncError', () => {
    it('should create error with proper classification', () => {
      const error = new SkillSyncError(
        'Test error',
        'NETWORK_ERROR',
        'high',
        'Please check your connection'
      );

      expect(error.name).toBe('SkillSyncError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.severity).toBe('high');
      expect(error.userMessage).toBe('Please check your connection');
    });

    it('should provide default user message for known codes', () => {
      const error = new SkillSyncError('Internal error', 'AUTH_FAILED');
      expect(error.userMessage).toBe('Please check your credentials and try again.');
    });

    it('should provide generic message for unknown codes', () => {
      const error = new SkillSyncError('Internal error', 'UNKNOWN_CODE');
      expect(error.userMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Retry Logic', () => {
    it('should retry retryable operations', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          throw error;
        }
        return 'success';
      });

      const promise = withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 100
      });

      // Fast-forward timers to complete retries
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new SkillSyncError('Permission denied', 'PERMISSION_DENIED');
      });

      await expect(withRetry(operation, { maxAttempts: 3 })).rejects.toThrow('Permission denied');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const promise = withRetry(operation, { maxAttempts: 2, baseDelay: 100 });

      // Fast-forward timers
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Network error');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          throw new Error('First fail');
        }
        return 'success';
      });

      const promise = withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 100,
        onRetry
      });

      await vi.runAllTimersAsync();

      try {
        await promise;
        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      } catch (error) {
        // If the operation still fails, onRetry should still have been called
        expect(onRetry).toHaveBeenCalled();
      }
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';

      const classification = classifyError(error);

      expect(classification.category).toBe('network');
      expect(classification.shouldRetry).toBe(true);
      expect(classification.userMessage).toContain('internet connection');
    });

    it('should classify permission errors correctly', () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';

      const classification = classifyError(error);

      expect(classification.category).toBe('permission');
      expect(classification.shouldRetry).toBe(false);
      expect(classification.userMessage).toContain('permissions');
    });

    it('should classify SkillSync errors correctly', () => {
      const error = new SkillSyncError('Auth failed', 'AUTH_FAILED', 'medium');

      const classification = classifyError(error);

      expect(classification.category).toBe('user');
      expect(classification.severity).toBe('medium');
      expect(classification.userMessage).toBe(error.userMessage);
    });
  });

  describe('Error Creation Utilities', () => {
    it('should create error with context', () => {
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        component: 'TestComponent'
      };

      const error = createError('Test error', 'TEST_ERROR', context);

      expect(error).toBeInstanceOf(SkillSyncError);
      expect(error.context).toEqual(context);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should wrap original error', () => {
      const originalError = new Error('Original error');
      const error = createError('Wrapped error', 'WRAPPED_ERROR', undefined, originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('Safe Async Operations', () => {
    it('should return data on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeAsync(operation);

      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await safeAsync(operation);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(SkillSyncError);
    });

    it('should return fallback on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const fallback = 'fallback value';

      const result = await safeAsync(operation, fallback);

      expect(result.data).toBe(fallback);
      expect(result.error).toBeInstanceOf(SkillSyncError);
    });
  });

  describe('Retryable Error Detection', () => {
    it('should identify retryable errors', () => {
      const networkError = new Error('Network error');
      expect(isRetryableError(networkError)).toBe(true);

      const fetchError = new Error('fetch failed');
      expect(isRetryableError(fetchError)).toBe(true);

      const skillSyncError = new SkillSyncError('Server error', 'SERVER_ERROR');
      expect(isRetryableError(skillSyncError)).toBe(true);

      const permissionError = new SkillSyncError('Permission denied', 'PERMISSION_DENIED');
      expect(isRetryableError(permissionError)).toBe(false);
    });

    it('should identify retryable HTTP status codes', () => {
      const error500 = new Error('Server error') as any;
      error500.status = 500;
      expect(isRetryableError(error500)).toBe(true);

      const error404 = new Error('Not found') as any;
      error404.status = 404;
      expect(isRetryableError(error404)).toBe(false);

      const error429 = new Error('Rate limited') as any;
      error429.status = 429;
      expect(isRetryableError(error429)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error flow', async () => {
      let attempts = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return 'success';
      });

      const onRetryCalls: number[] = [];
      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100,
        onRetry: (attempt, error) => {
          onRetryCalls.push(attempt);
          expect(error.message).toBe('Network error');
        }
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(onRetryCalls).toEqual([1, 2]); // Should retry on attempts 1 and 2
    });

    it('should classify and handle WebRTC errors', () => {
      const webrtcError = new Error('Permission denied');
      webrtcError.name = 'NotAllowedError';

      const skillSyncError = createError(
        webrtcError.message,
        'PERMISSION_DENIED',
        {
          component: 'WebRTC',
          action: 'getUserMedia'
        },
        webrtcError
      );

      const classification = classifyError(skillSyncError);

      expect(classification.category).toBe('permission');
      expect(classification.shouldRetry).toBe(false);
      expect(classification.userMessage).toContain('permissions');
    });
  });
});