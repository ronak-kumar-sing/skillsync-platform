/**
 * React hook for comprehensive error handling with retry logic and user feedback
 * Provides consistent error handling patterns across SkillSync components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SkillSyncError, withRetry, RetryOptions, classifyError } from '@/lib/error-handling';
import { logger } from '@/lib/logging';
import { getBrowserInfo, isSupported } from '@/lib/browser-detection';

export interface ErrorState {
  error: SkillSyncError | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  lastRetryAt: Date | null;
}

export interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryOptions?: RetryOptions;
  context?: {
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
  };
  onError?: (error: SkillSyncError) => void;
  onRetry?: (attempt: number, error: SkillSyncError) => void;
  onMaxRetriesReached?: (error: SkillSyncError) => void;
  autoRetry?: boolean;
  showToast?: boolean;
}

export interface UseErrorHandlerReturn {
  // Error state
  error: SkillSyncError | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  hasError: boolean;

  // Actions
  handleError: (error: Error | SkillSyncError) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: { skipRetry?: boolean; context?: Record<string, any> }
  ) => Promise<T | null>;

  // Utilities
  getErrorMessage: () => string;
  getErrorSeverity: () => 'low' | 'medium' | 'high' | 'critical' | null;
  shouldShowError: () => boolean;
  getRecoveryActions: () => string[];
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxRetries = 3,
    retryOptions = {},
    context = {},
    onError,
    onRetry,
    onMaxRetriesReached,
    autoRetry = false,
    showToast = true
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
    lastRetryAt: null
  });

  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle error with classification and logging
   */
  const handleError = useCallback((error: Error | SkillSyncError) => {
    const skillSyncError = error instanceof SkillSyncError
      ? error
      : new SkillSyncError(
        error.message,
        'UNKNOWN_ERROR',
        'medium',
        undefined,
        context,
        error
      );

    const classification = classifyError(skillSyncError);
    const browserInfo = getBrowserInfo();
    const supportInfo = isSupported();

    // Enhanced logging with context
    const errorContext = {
      ...context,
      metadata: {
        classification,
        browserInfo: {
          name: browserInfo.name,
          version: browserInfo.version,
          platform: browserInfo.platform,
          isMobile: browserInfo.isMobile
        },
        supportInfo: {
          supported: supportInfo.supported,
          limitations: supportInfo.limitations
        },
        retryCount: errorState.retryCount,
        canRetry: classification.shouldRetry && errorState.retryCount < maxRetries
      }
    };

    // Log error with appropriate severity
    if (classification.severity === 'critical') {
      logger.critical('Error handled by useErrorHandler', skillSyncError, errorContext);
    } else {
      logger.error('Error handled by useErrorHandler', skillSyncError, errorContext);
    }

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error: skillSyncError,
      canRetry: classification.shouldRetry && prev.retryCount < maxRetries,
      isRetrying: false
    }));

    // Call custom error handler
    onError?.(skillSyncError);

    // Show toast notification if enabled
    if (showToast && typeof window !== 'undefined') {
      showErrorToast(skillSyncError, classification);
    }

    // Auto-retry if enabled and conditions are met
    if (autoRetry && classification.shouldRetry && errorState.retryCount < maxRetries) {
      scheduleRetry();
    }
  }, [context, errorState.retryCount, maxRetries, onError, showToast, autoRetry]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false,
      lastRetryAt: null
    });

    lastOperationRef.current = null;
  }, []);

  /**
   * Schedule automatic retry
   */
  const scheduleRetry = useCallback(() => {
    if (!errorState.canRetry || retryTimeoutRef.current) return;

    const delay = Math.min(
      (retryOptions.baseDelay || 1000) * Math.pow(2, errorState.retryCount),
      retryOptions.maxDelay || 10000
    );

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    retryTimeoutRef.current = setTimeout(() => {
      retry();
    }, delay);
  }, [errorState.canRetry, errorState.retryCount, retryOptions]);

  /**
   * Manual retry
   */
  const retry = useCallback(async () => {
    if (!errorState.canRetry || !lastOperationRef.current) return;

    const operation = lastOperationRef.current;
    const newRetryCount = errorState.retryCount + 1;

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: newRetryCount,
      lastRetryAt: new Date()
    }));

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Log retry attempt
    logger.info('Retrying operation', context, {
      retryCount: newRetryCount,
      maxRetries,
      error: errorState.error?.message
    });

    // Call retry callback
    if (errorState.error) {
      onRetry?.(newRetryCount, errorState.error);
    }

    try {
      await operation();

      // Success - clear error state
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        canRetry: false,
        lastRetryAt: null
      });

      logger.info('Retry successful', context, { retryCount: newRetryCount });

    } catch (error) {
      const newCanRetry = newRetryCount < maxRetries;

      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        canRetry: newCanRetry
      }));

      if (!newCanRetry && errorState.error) {
        onMaxRetriesReached?.(errorState.error);
        logger.warn('Max retries reached', context, {
          retryCount: newRetryCount,
          maxRetries,
          error: errorState.error.message
        });
      } else {
        // Handle the new error
        handleError(error as Error);
      }
    }
  }, [errorState, context, maxRetries, onRetry, onMaxRetriesReached, handleError]);

  /**
   * Execute operation with error handling
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: { skipRetry?: boolean; context?: Record<string, any> } = {}
  ): Promise<T | null> => {
    const { skipRetry = false, context: operationContext = {} } = options;

    // Store operation for potential retry
    if (!skipRetry) {
      lastOperationRef.current = operation;
    }

    // Clear previous error
    if (errorState.error) {
      clearError();
    }

    try {
      if (skipRetry) {
        return await operation();
      } else {
        return await withRetry(operation, {
          ...retryOptions,
          maxAttempts: maxRetries + 1, // +1 because withRetry counts initial attempt
          onRetry: (attempt, error) => {
            setErrorState(prev => ({
              ...prev,
              retryCount: attempt,
              isRetrying: true
            }));

            logger.info('Operation retry', { ...context, ...operationContext }, {
              attempt,
              error: error.message
            });
          }
        });
      }
    } catch (error) {
      handleError(error as Error);
      return null;
    }
  }, [errorState.error, clearError, retryOptions, maxRetries, context, handleError]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((): string => {
    if (!errorState.error) return '';
    return errorState.error.userMessage || errorState.error.message;
  }, [errorState.error]);

  /**
   * Get error severity
   */
  const getErrorSeverity = useCallback((): 'low' | 'medium' | 'high' | 'critical' | null => {
    return errorState.error?.severity || null;
  }, [errorState.error]);

  /**
   * Determine if error should be shown to user
   */
  const shouldShowError = useCallback((): boolean => {
    if (!errorState.error) return false;

    // Don't show low severity errors during retry
    if (errorState.isRetrying && errorState.error.severity === 'low') {
      return false;
    }

    return true;
  }, [errorState.error, errorState.isRetrying]);

  /**
   * Get recovery action suggestions
   */
  const getRecoveryActions = useCallback((): string[] => {
    if (!errorState.error) return [];

    const actions: string[] = [];
    const classification = classifyError(errorState.error);

    switch (classification.category) {
      case 'network':
        actions.push('Check your internet connection');
        actions.push('Try again in a few moments');
        break;
      case 'permission':
        actions.push('Check browser permissions');
        actions.push('Allow camera and microphone access');
        break;
      case 'validation':
        actions.push('Check your input');
        actions.push('Ensure all required fields are filled');
        break;
      case 'system':
        actions.push('Refresh the page');
        actions.push('Try a different browser');
        break;
      default:
        if (errorState.canRetry) {
          actions.push('Try again');
        }
        actions.push('Contact support if the problem persists');
    }

    return actions;
  }, [errorState.error, errorState.canRetry]);

  return {
    // Error state
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry: errorState.canRetry,
    hasError: !!errorState.error,

    // Actions
    handleError,
    clearError,
    retry,
    executeWithErrorHandling,

    // Utilities
    getErrorMessage,
    getErrorSeverity,
    shouldShowError,
    getRecoveryActions
  };
}

/**
 * Show error toast notification
 */
function showErrorToast(error: SkillSyncError, classification: ReturnType<typeof classifyError>) {
  // In a real implementation, this would integrate with your toast system
  // For now, we'll use a simple console log
  console.warn('Error Toast:', {
    message: error.userMessage,
    severity: classification.severity,
    category: classification.category
  });

  // Example integration with react-hot-toast:
  // import toast from 'react-hot-toast';
  //
  // const toastOptions = {
  //   duration: classification.severity === 'critical' ? 10000 : 5000,
  //   icon: classification.severity === 'critical' ? '🚨' : '⚠️'
  // };
  //
  // if (classification.severity === 'critical') {
  //   toast.error(error.userMessage, toastOptions);
  // } else {
  //   toast(error.userMessage, toastOptions);
  // }
}

export default useErrorHandler;