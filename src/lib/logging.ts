/**
 * Comprehensive logging and error tracking service for SkillSync platform
 * Provides structured logging, error tracking, and performance monitoring
 */

import { ErrorContext, SkillSyncError } from './error-handling';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: ErrorContext;
  error?: Error;
  metadata?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  component?: string;
  action?: string;
  duration?: number;
  stackTrace?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startPeriodicFlush();
      this.setupUnhandledErrorCapture();
      this.setupPerformanceMonitoring();
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.log('debug', message, context, undefined, metadata);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.log('info', message, context, undefined, metadata);
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.log('warn', message, context, undefined, metadata);
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.log('error', message, context, error, metadata);
  }

  /**
   * Log critical errors
   */
  critical(message: string, error?: Error, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.log('critical', message, context, error, metadata);

    // Immediately flush critical errors
    if (this.isProduction) {
      this.flush();
    }
  }

  /**
   * Log performance metrics
   */
  performance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const entry: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.log('🚀 Performance:', entry);
    }

    // In production, send to analytics service
    if (this.isProduction) {
      this.sendPerformanceMetric(entry);
    }
  }

  /**
   * Log user actions for analytics
   */
  userAction(action: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, context, {
      ...metadata,
      type: 'user_action',
      action
    });
  }

  /**
   * Log WebRTC events
   */
  webrtc(event: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.info(`WebRTC: ${event}`, context, {
      ...metadata,
      type: 'webrtc_event',
      event
    });
  }

  /**
   * Log matching events
   */
  matching(event: string, context?: ErrorContext, metadata?: Record<string, any>): void {
    this.info(`Matching: ${event}`, context, {
      ...metadata,
      type: 'matching_event',
      event
    });
  }

  /**
   * Log API calls
   */
  apiCall(method: string, url: string, duration: number, status?: number, error?: Error): void {
    const level: LogLevel = error ? 'error' : status && status >= 400 ? 'warn' : 'info';
    const message = `API ${method} ${url} - ${status || 'unknown'} (${duration}ms)`;

    this.log(level, message, undefined, error, {
      type: 'api_call',
      method,
      url,
      duration,
      status
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: ErrorContext,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      metadata,
      sessionId: context?.sessionId,
      userId: context?.userId,
      component: context?.component,
      action: context?.action,
      stackTrace: error?.stack
    };

    // Console output in development
    if (this.isDevelopment) {
      this.consoleLog(entry);
    }

    // Buffer for production
    if (this.isProduction) {
      this.bufferLog(entry);
    }
  }

  /**
   * Console logging with colors and formatting
   */
  private consoleLog(entry: LogEntry): void {
    const colors = {
      debug: '#6B7280',
      info: '#3B82F6',
      warn: '#F59E0B',
      error: '#EF4444',
      critical: '#DC2626'
    };

    const color = colors[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    console.group(`%c${entry.level.toUpperCase()} ${timestamp}`, `color: ${color}; font-weight: bold;`);
    console.log(entry.message);

    if (entry.context) {
      console.log('Context:', entry.context);
    }

    if (entry.metadata) {
      console.log('Metadata:', entry.metadata);
    }

    if (entry.error) {
      console.error('Error:', entry.error);
    }

    console.groupEnd();
  }

  /**
   * Buffer logs for batch sending
   */
  private bufferLog(entry: LogEntry): void {
    this.logBuffer.push(entry);

    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush logs to external service
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // In a real implementation, send to logging service like:
      // - Sentry
      // - LogRocket
      // - DataDog
      // - Custom logging endpoint

      if (this.isDevelopment) {
        console.log('📤 Flushing logs:', logs.length);
      }

      // Example: Send to custom logging endpoint
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ logs })
      // });

    } catch (error) {
      // If logging fails, put logs back in buffer
      this.logBuffer.unshift(...logs);
      console.error('Failed to flush logs:', error);
    }
  }

  /**
   * Send performance metrics
   */
  private async sendPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Example: Send to analytics service
      // await fetch('/api/analytics/performance', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric)
      // });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  /**
   * Start periodic log flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Setup global error capture
   */
  private setupUnhandledErrorCapture(): void {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.critical('Unhandled promise rejection', event.reason, {
        component: 'global',
        action: 'unhandled_rejection'
      });
    });

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.critical('Global error', event.error, {
        component: 'global',
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if ('performance' in window && 'PerformanceObserver' in window) {
      // Monitor navigation timing
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.performance({
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.navigationStart,
              unit: 'ms',
              context: {
                type: navEntry.type,
                redirectCount: navEntry.redirectCount
              }
            });
          }

          if (entry.entryType === 'largest-contentful-paint') {
            this.performance({
              name: 'largest_contentful_paint',
              value: entry.startTime,
              unit: 'ms'
            });
          }

          if (entry.entryType === 'first-input') {
            const fidEntry = entry as PerformanceEventTiming;
            this.performance({
              name: 'first_input_delay',
              value: fidEntry.processingStart - fidEntry.startTime,
              unit: 'ms'
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.performance({
          name: 'memory_usage',
          value: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
          unit: 'percentage',
          context: {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          }
        });
      }, 60000); // Every minute
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton instance
export const logger = new Logger();

/**
 * Higher-order function to add logging to async functions
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const functionName = fn.name || 'anonymous';

    logger.debug(`Starting ${functionName}`, context);

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      logger.debug(`Completed ${functionName}`, context, { duration });
      logger.performance({
        name: `function_${functionName}`,
        value: duration,
        unit: 'ms',
        context
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `Failed ${functionName}`,
        error instanceof Error ? error : new Error(String(error)),
        context,
        { duration }
      );
      throw error;
    }
  }) as T;
}

/**
 * Decorator for class methods (if using experimental decorators)
 */
export function LogMethod(context?: ErrorContext) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = withLogging(originalMethod, {
      ...context,
      component: target.constructor.name,
      action: propertyKey
    });
  };
}

export default logger;