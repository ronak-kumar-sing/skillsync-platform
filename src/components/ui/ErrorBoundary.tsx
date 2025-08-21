'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { logger } from '@/lib/logging';
import { SkillSyncError, classifyError } from '@/lib/error-handling';
import { getBrowserInfo, isSupported } from '@/lib/browser-detection';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  context?: {
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
  };
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // Enhanced error logging with context
    const browserInfo = getBrowserInfo();
    const supportInfo = isSupported();
    const classification = classifyError(error);

    // Create enhanced error context
    const errorContext = {
      ...this.props.context,
      component: this.props.context?.component || 'ErrorBoundary',
      action: 'component_error',
      metadata: {
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
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
        classification,
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    };

    // Log with appropriate severity
    if (classification.severity === 'critical') {
      logger.critical('Component error boundary triggered', error, errorContext);
    } else {
      logger.error('Component error boundary triggered', error, errorContext);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  shouldAutoRetry = (error: Error): boolean => {
    // Auto-retry for network errors and temporary failures
    if (error instanceof SkillSyncError) {
      return ['NETWORK_ERROR', 'SERVER_ERROR', 'WEBRTC_FAILED'].includes(error.code);
    }

    // Auto-retry for certain native errors
    return error.name === 'NetworkError' ||
      error.message.includes('fetch') ||
      error.message.includes('Loading chunk');
  };

  scheduleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.setState({ isRetrying: true });

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, this.state.retryCount) * 1000;

    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  handleRetry = () => {
    logger.info('Retrying after error boundary', this.props.context, {
      retryCount: this.state.retryCount + 1,
      error: this.state.error?.message
    });

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      isRetrying: false
    });

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }
  };

  handleReload = () => {
    logger.info('Reloading page after error', this.props.context);
    window.location.reload();
  };

  handleReportError = () => {
    if (this.state.error) {
      // In a real implementation, this would open a feedback form or send to support
      const errorReport = {
        error: this.state.error.message,
        stack: this.state.error.stack,
        componentStack: this.state.errorInfo?.componentStack,
        browserInfo: getBrowserInfo(),
        timestamp: new Date().toISOString(),
        context: this.props.context
      };

      logger.info('User reported error', this.props.context, { errorReport });

      // Copy error details to clipboard for user to share
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
        alert('Error details copied to clipboard. Please share with support.');
      } else {
        alert('Please take a screenshot and contact support.');
      }
    }
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const classification = this.state.error ? classifyError(this.state.error) : null;
      const browserInfo = getBrowserInfo();
      const supportInfo = isSupported();
      const isPageLevel = this.props.level === 'page';

      // Show retry indicator
      if (this.state.isRetrying) {
        return (
          <div className={`${isPageLevel ? 'min-h-screen' : 'min-h-[200px]'} flex items-center justify-center p-4`}>
            <GlassCard
              variant="medium"
              blur="lg"
              className="max-w-md w-full p-6 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Retrying...</h3>
              <p className="text-white/70 text-sm">
                Attempting to recover from the error (Attempt {this.state.retryCount + 1}/{this.maxRetries})
              </p>
            </GlassCard>
          </div>
        );
      }

      // Default error UI
      return (
        <div className={`${isPageLevel ? 'min-h-screen' : 'min-h-[200px]'} flex items-center justify-center p-4`}>
          <GlassCard
            variant="medium"
            blur="lg"
            className={`${isPageLevel ? 'max-w-lg' : 'max-w-md'} w-full p-8 text-center`}
          >
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h2 className={`${isPageLevel ? 'text-2xl' : 'text-xl'} font-bold text-white mb-4`}>
              {classification?.userMessage || 'Oops! Something went wrong'}
            </h2>

            <p className="text-white/70 mb-6">
              {this.state.retryCount > 0
                ? `We've tried ${this.state.retryCount} time${this.state.retryCount > 1 ? 's' : ''} to fix this. `
                : ''
              }
              {classification?.category === 'network'
                ? 'Please check your internet connection.'
                : classification?.category === 'permission'
                  ? 'Please check your browser permissions.'
                  : 'This has been logged and we\'ll look into it.'
              }
            </p>

            {/* Browser compatibility warning */}
            {!supportInfo.supported && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-yellow-400 font-medium text-sm">Browser Compatibility Issue</span>
                </div>
                <p className="text-yellow-200/80 text-sm">
                  Your browser ({browserInfo.name} {browserInfo.version}) may not support all features.
                </p>
                {supportInfo.recommendations.length > 0 && (
                  <p className="text-yellow-200/80 text-sm mt-1">
                    {supportInfo.recommendations[0]}
                  </p>
                )}
              </div>
            )}

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-white/80 cursor-pointer mb-2 font-medium">
                  Error Details (Development)
                </summary>
                <div className="bg-black/20 rounded-lg p-4 text-sm">
                  <div className="text-red-400 font-mono mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="text-white/60 text-xs overflow-auto whitespace-pre-wrap max-h-32">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-4">
                      <div className="text-yellow-400 font-mono mb-1">Component Stack:</div>
                      <pre className="text-white/60 text-xs overflow-auto whitespace-pre-wrap max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  {classification && (
                    <div className="mt-4">
                      <div className="text-blue-400 font-mono mb-1">Classification:</div>
                      <div className="text-white/60 text-xs">
                        Category: {classification.category}, Severity: {classification.severity}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(classification?.shouldRetry !== false && this.state.retryCount < this.maxRetries) && (
                <GlassButton
                  variant="primary"
                  onClick={this.handleRetry}
                  className="flex-1 sm:flex-none"
                >
                  Try Again
                </GlassButton>
              )}

              {isPageLevel && (
                <GlassButton
                  variant="ghost"
                  onClick={this.handleReload}
                  className="flex-1 sm:flex-none"
                >
                  Reload Page
                </GlassButton>
              )}

              <GlassButton
                variant="outline"
                onClick={this.handleReportError}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                Report Issue
              </GlassButton>
            </div>

            {/* Help Text */}
            <p className="text-white/50 text-sm mt-6">
              {this.state.retryCount >= this.maxRetries
                ? 'Maximum retry attempts reached. Please reload the page or contact support.'
                : 'If this problem persists, please contact support.'
              }
            </p>

            {/* Retry count indicator */}
            {this.state.retryCount > 0 && (
              <div className="mt-4 text-white/40 text-xs">
                Retry attempts: {this.state.retryCount}/{this.maxRetries}
              </div>
            )}
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Simple error fallback components
const SimpleErrorFallback = ({
  error,
  resetError
}: {
  error?: Error;
  resetError?: () => void;
}) => (
  <div className="p-6 text-center">
    <div className="text-red-400 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
    <p className="text-white/70 mb-4">
      {error?.message || 'An unexpected error occurred'}
    </p>
    {resetError && (
      <GlassButton variant="primary" size="sm" onClick={resetError}>
        Try again
      </GlassButton>
    )}
  </div>
);

const MinimalErrorFallback = () => (
  <div className="flex items-center justify-center p-4 text-white/70">
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <span className="text-sm">Failed to load</span>
  </div>
);

export {
  ErrorBoundary,
  withErrorBoundary,
  SimpleErrorFallback,
  MinimalErrorFallback
};