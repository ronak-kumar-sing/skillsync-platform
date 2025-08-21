/**
 * Demonstration of the comprehensive error handling system
 * Shows how to use error handling, retry logic, and browser detection
 */

import {
  SkillSyncError,
  withRetry,
  fetchWithRetry,
  safeAsync,
  createError
} from '@/lib/error-handling';
import { logger } from '@/lib/logging';
import { getBrowserInfo, isSupported } from '@/lib/browser-detection';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Example 1: Basic error creation and classification
export function demonstrateErrorCreation() {
  console.log('=== Error Creation Demo ===');

  // Create a network error
  const networkError = new SkillSyncError(
    'Failed to connect to server',
    'NETWORK_ERROR',
    'high',
    'Please check your internet connection and try again.'
  );

  console.log('Network Error:', {
    message: networkError.message,
    code: networkError.code,
    severity: networkError.severity,
    userMessage: networkError.userMessage
  });

  // Create a permission error
  const permissionError = createError(
    'Camera access denied',
    'PERMISSION_DENIED',
    {
      component: 'VideoCall',
      action: 'getUserMedia',
      userId: 'user123'
    }
  );

  console.log('Permission Error:', {
    message: permissionError.message,
    code: permissionError.code,
    context: permissionError.context
  });
}

// Example 2: Retry logic demonstration
export async function demonstrateRetryLogic() {
  console.log('\n=== Retry Logic Demo ===');

  let attempts = 0;
  const unreliableOperation = async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);

    if (attempts < 3) {
      throw new Error('Temporary network failure');
    }

    return 'Operation successful!';
  };

  try {
    const result = await withRetry(unreliableOperation, {
      maxAttempts: 5,
      baseDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retrying after attempt ${attempt}: ${error.message}`);
      }
    });

    console.log('Final result:', result);
  } catch (error) {
    console.error('Operation failed after all retries:', error);
  }
}

// Example 3: Safe async operations
export async function demonstrateSafeAsync() {
  console.log('\n=== Safe Async Demo ===');

  // Operation that succeeds
  const successOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'Success data';
  };

  const successResult = await safeAsync(successOperation, 'fallback');
  console.log('Success result:', successResult);

  // Operation that fails
  const failOperation = async () => {
    throw new Error('Something went wrong');
  };

  const failResult = await safeAsync(failOperation, 'fallback data');
  console.log('Fail result:', failResult);
}

// Example 4: Browser compatibility checking
export function demonstrateBrowserDetection() {
  console.log('\n=== Browser Detection Demo ===');

  const browserInfo = getBrowserInfo();
  console.log('Browser Info:', {
    name: browserInfo.name,
    version: browserInfo.version,
    platform: browserInfo.platform,
    isMobile: browserInfo.isMobile,
    supportsWebRTC: browserInfo.supportsWebRTC
  });

  const supportInfo = isSupported();
  console.log('Support Info:', {
    supported: supportInfo.supported,
    limitations: supportInfo.limitations,
    recommendations: supportInfo.recommendations
  });

  if (!supportInfo.supported) {
    console.warn('Browser not fully supported!');
    supportInfo.limitations.forEach(limitation => {
      console.warn(`- ${limitation}`);
    });

    console.log('Recommendations:');
    supportInfo.recommendations.forEach(recommendation => {
      console.log(`- ${recommendation}`);
    });
  }
}

// Example 5: Enhanced fetch with retry
export async function demonstrateEnhancedFetch() {
  console.log('\n=== Enhanced Fetch Demo ===');

  try {
    // This will retry on network failures
    const response = await fetchWithRetry('/api/test-endpoint', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token123'
      }
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Fetch retry ${attempt}: ${error.message}`);
      }
    });

    const data = await response.json();
    console.log('Fetch successful:', data);
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

// Example 6: Logging demonstration
export function demonstrateLogging() {
  console.log('\n=== Logging Demo ===');

  // Basic logging
  logger.info('Application started');
  logger.warn('This is a warning message');

  // Logging with context
  logger.error('Database connection failed', new Error('Connection timeout'), {
    component: 'DatabaseService',
    action: 'connect',
    userId: 'user123',
    metadata: {
      host: 'localhost',
      port: 5432,
      timeout: 30000
    }
  });

  // Performance logging
  logger.performance({
    name: 'api_response_time',
    value: 250,
    unit: 'ms',
    context: {
      endpoint: '/api/users',
      method: 'GET'
    }
  });

  // User action logging
  logger.userAction('video_call_started', {
    userId: 'user123',
    sessionId: 'session456',
    component: 'VideoCall'
  });

  // WebRTC specific logging
  logger.webrtc('Connection established', {
    sessionId: 'session456',
    metadata: {
      connectionType: 'peer-to-peer',
      quality: 'high'
    }
  });
}

// Example 7: React hook usage (pseudo-code for demonstration)
export function demonstrateErrorHandlerHook() {
  console.log('\n=== Error Handler Hook Demo ===');

  // This would be used in a React component
  const errorHandlerExample = {
    // Simulated hook return
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: true,
    hasError: false,

    // Simulated methods
    handleError: (error: Error) => {
      console.log('Handling error:', error.message);
    },

    executeWithErrorHandling: async (operation: () => Promise<any>) => {
      try {
        return await operation();
      } catch (error) {
        console.log('Operation failed, handling error...');
        return null;
      }
    },

    getErrorMessage: () => 'User-friendly error message',
    getRecoveryActions: () => [
      'Check your internet connection',
      'Try again in a few moments',
      'Contact support if the problem persists'
    ]
  };

  // Example usage
  const performWebRTCOperation = async () => {
    throw new Error('WebRTC connection failed');
  };

  errorHandlerExample.executeWithErrorHandling(performWebRTCOperation);

  console.log('Recovery actions:', errorHandlerExample.getRecoveryActions());
}

// Run all demonstrations
export async function runAllDemonstrations() {
  console.log('🚀 Starting Error Handling System Demonstrations\n');

  demonstrateErrorCreation();
  await demonstrateRetryLogic();
  await demonstrateSafeAsync();
  demonstrateBrowserDetection();
  await demonstrateEnhancedFetch();
  demonstrateLogging();
  demonstrateErrorHandlerHook();

  console.log('\n✅ All demonstrations completed!');
}

// Export for use in other parts of the application
export default {
  demonstrateErrorCreation,
  demonstrateRetryLogic,
  demonstrateSafeAsync,
  demonstrateBrowserDetection,
  demonstrateEnhancedFetch,
  demonstrateLogging,
  demonstrateErrorHandlerHook,
  runAllDemonstrations
};