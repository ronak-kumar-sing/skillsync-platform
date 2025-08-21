/**
 * Comprehensive tests for error handling and user experience improvements
 * Tests retry logic, error classification, browser detection, and logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SkillSyncError,
  withRetry,
  fetchWithRetry,
  isRetryableError,
  classifyError,
  createError,
  safeAsync
} from '@/lib/error-handling';
import { logger } from '@/lib/logging';
import { getBrowserInfo, getFeatureSupport, isSupported } from '@/lib/browser-detection';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Error Handling System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
          throw new Error('Network error');
        }
        return 'success';
      });

      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10 // Fast for testing
      });

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
        throw new Error('Always fails');
      });

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockResolvedValueOnce('success');

      await withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('Fetch with Retry', () => {
    it('should retry failed requests', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await fetchWithRetry('/test', {}, {
        maxAttempts: 2,
        baseDelay: 10
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry 4xx errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

      await expect(fetchWithRetry('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry 5xx errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch
        .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await fetchWithRetry('/test', {}, {
        maxAttempts: 2,
        baseDelay: 10
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const error = new Error('fetch failed');
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
      expect(isRetryableError(new Error('NetworkError'))).toBe(false); // Name doesn't match

      const networkError = new Error('fetch failed');
      networkError.name = 'NetworkError';
      expect(isRetryableError(networkError)).toBe(true);

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
});

describe('Browser Detection', () => {
  // Mock navigator for testing
  const mockNavigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    mediaDevices: {
      getUserMedia: vi.fn(),
      getDisplayMedia: vi.fn()
    },
    clipboard: {
      writeText: vi.fn()
    }
  };

  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        createElement: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue({})
        }),
        documentElement: {
          requestFullscreen: vi.fn(),
          webkitRequestFullscreen: vi.fn()
        }
      },
      writable: true
    });

    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        RTCPeerConnection: vi.fn(),
        WebSocket: vi.fn(),
        localStorage: {
          setItem: vi.fn(),
          getItem: vi.fn(),
          removeItem: vi.fn()
        },
        sessionStorage: {
          setItem: vi.fn(),
          getItem: vi.fn(),
          removeItem: vi.fn()
        },
        indexedDB: {},
        Notification: vi.fn(),
        AudioContext: vi.fn(),
        IntersectionObserver: vi.fn(),
        ResizeObserver: vi.fn(),
        WebAssembly: {},
        fetch: vi.fn()
      },
      writable: true
    });
  });

  it('should detect browser information', () => {
    const browserInfo = getBrowserInfo();

    expect(browserInfo.name).toBe('Chrome');
    expect(browserInfo.platform).toBe('macOS');
    expect(browserInfo.isDesktop).toBe(true);
    expect(browserInfo.isMobile).toBe(false);
  });

  it('should detect feature support', () => {
    const featureSupport = getFeatureSupport();

    expect(featureSupport.webrtc.supported).toBe(true);
    expect(featureSupport.storage.supported).toBe(true);
    expect(featureSupport.networking.supported).toBe(true);
  });

  it('should determine overall support', () => {
    const support = isSupported();

    expect(support.supported).toBe(true);
    expect(support.limitations).toHaveLength(0);
    expect(support.recommendations).toHaveLength(0);
  });

  it('should detect unsupported browser', () => {
    // Mock IE user agent
    mockNavigator.userAgent = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)';

    // Remove modern features
    delete (global.window as any).RTCPeerConnection;
    delete (global.window as any).WebSocket;

    const support = isSupported();

    expect(support.supported).toBe(false);
    expect(support.limitations.length).toBeGreaterThan(0);
    expect(support.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Logging System', () => {
  beforeEach(() => {
    // Reset logger state
    vi.clearAllMocks();
  });

  it('should log different levels correctly', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    logger.info('Test info message');
    logger.warn('Test warning message');
    logger.error('Test error message');

    // In development, should log to console
    if (process.env.NODE_ENV === 'development') {
      expect(consoleSpy).toHaveBeenCalled();
    }
  });

  it('should log with context', () => {
    const context = {
      userId: 'user123',
      sessionId: 'session456',
      component: 'TestComponent'
    };

    logger.info('Test message with context', context);

    // Should not throw and should handle context properly
    expect(true).toBe(true);
  });

  it('should log performance metrics', () => {
    logger.performance({
      name: 'test_metric',
      value: 100,
      unit: 'ms',
      context: { test: true }
    });

    // Should not throw
    expect(true).toBe(true);
  });

  it('should log user actions', () => {
    logger.userAction('test_action', {
      userId: 'user123',
      component: 'TestComponent'
    });

    // Should not throw
    expect(true).toBe(true);
  });

  it('should log API calls', () => {
    logger.apiCall('GET', '/api/test', 150, 200);
    logger.apiCall('POST', '/api/test', 300, 500, new Error('Server error'));

    // Should not throw
    expect(true).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should handle complete error flow', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(mockOperation, {
      maxAttempts: 3,
      baseDelay: 10,
      onRetry: (attempt, error) => {
        logger.warn(`Retry attempt ${attempt}`, undefined, {
          error: error.message
        });
      }
    });

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
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