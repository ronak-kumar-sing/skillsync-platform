/**
 * Comprehensive error handling utilities for SkillSync platform
 * Provides retry logic, error classification, and user-friendly error messages
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class SkillSyncError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly userMessage: string;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    userMessage?: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(message);
    this.name = 'SkillSyncError';
    this.code = code;
    this.severity = severity;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.context = context;
    this.originalError = originalError;
  }

  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      'AUTH_FAILED': 'Please check your credentials and try again.',
      'NETWORK_ERROR': 'Please check your internet connection and try again.',
      'WEBRTC_FAILED': 'Video call connection failed. Please try again.',
      'PERMISSION_DENIED': 'Please grant the required permissions to continue.',
      'BROWSER_UNSUPPORTED': 'Your browser doesn\'t support this feature. Please update or try a different browser.',
      'DEVICE_UNSUPPORTED': 'This feature is not supported on your device.',
      'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
      'SERVER_ERROR': 'Something went wrong on our end. Please try again later.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'MATCHING_FAILED': 'Unable to find a match right now. Please try again.',
      'QUEUE_FULL': 'The matching queue is currently full. Please try again in a few minutes.',
    };

    return messages[code] || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => isRetryableError(error),
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      onRetry?.(attempt, lastError);

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are generally retryable
  if (error.name === 'NetworkError' || error.message.includes('fetch') || error.message.includes('Network error')) {
    return true;
  }

  // SkillSync errors with specific codes
  if (error instanceof SkillSyncError) {
    const retryableCodes = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'WEBRTC_FAILED',
      'MATCHING_FAILED'
    ];
    return retryableCodes.includes(error.code);
  }

  // HTTP status codes that are retryable
  if ('status' in error) {
    const status = (error as any).status;
    return status >= 500 || status === 408 || status === 429;
  }

  // WebRTC specific errors
  if (error.name === 'NotReadableError' || error.name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Enhanced fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new SkillSyncError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
        response.status >= 500 ? 'high' : 'medium'
      );
      (error as any).status = response.status;
      throw error;
    }

    return response;
  }, {
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error) => {
      if ('status' in error) {
        const status = (error as any).status;
        return status >= 500 || status === 408 || status === 429;
      }
      return isRetryableError(error);
    },
    ...retryOptions
  });
}

/**
 * WebRTC connection retry logic
 */
export async function retryWebRTCConnection(
  connectionFn: () => Promise<RTCPeerConnection>,
  options: RetryOptions = {}
): Promise<RTCPeerConnection> {
  return withRetry(connectionFn, {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 15000,
    retryCondition: (error) => {
      // Retry on connection failures but not on permission errors
      return error.name !== 'NotAllowedError' &&
        error.name !== 'NotFoundError' &&
        isRetryableError(error);
    },
    ...options
  });
}

/**
 * Error classification for better handling
 */
export function classifyError(error: Error): {
  category: 'network' | 'permission' | 'validation' | 'system' | 'user' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  shouldRetry: boolean;
} {
  if (error instanceof SkillSyncError) {
    return {
      category: getCategoryFromCode(error.code),
      severity: error.severity,
      userMessage: error.userMessage,
      shouldRetry: isRetryableError(error)
    };
  }

  // Network errors
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return {
      category: 'network',
      severity: 'medium',
      userMessage: 'Please check your internet connection and try again.',
      shouldRetry: true
    };
  }

  // Permission errors
  if (error.name === 'NotAllowedError') {
    return {
      category: 'permission',
      severity: 'high',
      userMessage: 'Please grant the required permissions to continue.',
      shouldRetry: false
    };
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    return {
      category: 'validation',
      severity: 'low',
      userMessage: 'Please check your input and try again.',
      shouldRetry: false
    };
  }

  // System errors
  if (error.name === 'TypeError' || error.name === 'ReferenceError') {
    return {
      category: 'system',
      severity: 'critical',
      userMessage: 'A technical error occurred. Please refresh the page.',
      shouldRetry: false
    };
  }

  // Default classification
  return {
    category: 'unknown',
    severity: 'medium',
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldRetry: true
  };
}

function getCategoryFromCode(code: string): 'network' | 'permission' | 'validation' | 'system' | 'user' | 'unknown' {
  const categoryMap: Record<string, 'network' | 'permission' | 'validation' | 'system' | 'user' | 'unknown'> = {
    'NETWORK_ERROR': 'network',
    'SERVER_ERROR': 'network',
    'PERMISSION_DENIED': 'permission',
    'VALIDATION_ERROR': 'validation',
    'AUTH_FAILED': 'user',
    'SESSION_EXPIRED': 'user',
    'BROWSER_UNSUPPORTED': 'system',
    'DEVICE_UNSUPPORTED': 'system',
  };

  return categoryMap[code] || 'unknown';
}

/**
 * Create error with context
 */
export function createError(
  message: string,
  code: string,
  context?: ErrorContext,
  originalError?: Error
): SkillSyncError {
  const classification = classifyError(originalError || new Error(message));

  return new SkillSyncError(
    message,
    code,
    classification.severity,
    classification.userMessage,
    context,
    originalError
  );
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  context?: ErrorContext
): Promise<{ data?: T; error?: SkillSyncError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const skillSyncError = error instanceof SkillSyncError
      ? error
      : createError(
        error instanceof Error ? error.message : String(error),
        'UNKNOWN_ERROR',
        context,
        error instanceof Error ? error : undefined
      );

    return { error: skillSyncError, data: fallback };
  }
}