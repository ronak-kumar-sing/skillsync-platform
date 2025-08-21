import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from './performance-monitor';
import { cache } from './cache';
import DatabasePoolOptimizer from './db-pool-optimizer';
import prisma from './prisma';

// Initialize database pool optimizer
const dbOptimizer = new DatabasePoolOptimizer(prisma);

/**
 * Next.js middleware for performance monitoring
 */
export function performanceMiddlewareNext() {
  return async (request: NextRequest) => {
    const start = Date.now();
    const url = new URL(request.url);

    // Skip monitoring for static assets
    if (url.pathname.startsWith('/_next/') ||
      url.pathname.startsWith('/api/_next/') ||
      url.pathname.includes('.')) {
      return NextResponse.next();
    }

    const response = NextResponse.next();

    // Record performance metrics after response
    response.headers.set('x-response-time', `${Date.now() - start}ms`);

    // Use setTimeout to record metrics after response is sent
    setTimeout(() => {
      const duration = Date.now() - start;
      performanceMonitor.recordApiResponseTime(
        url.pathname,
        request.method,
        duration,
        response.status
      );
    }, 0);

    return response;
  };
}

/**
 * API route wrapper with performance monitoring
 */
export function withPerformanceMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  routeName: string
) {
  return async (...args: T): Promise<R> => {
    const start = Date.now();
    let success = true;

    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - start;
      performanceMonitor.recordApiResponseTime(
        routeName,
        'API',
        duration,
        success ? 200 : 500
      );
    }
  };
}

/**
 * Database query wrapper with optimization
 */
export function withDatabaseOptimization<T>(
  queryFn: () => Promise<T>,
  queryName: string,
  cacheKey?: string,
  cacheTTL?: number
) {
  return dbOptimizer.optimizedQuery(queryFn, cacheKey, cacheTTL);
}

/**
 * Batch database operations with optimization
 */
export function withBatchOptimization<T>(
  queries: Array<{
    fn: () => Promise<T>;
    name: string;
    cacheKey?: string;
    cacheTTL?: number;
  }>
) {
  return dbOptimizer.batchExecute(queries);
}

/**
 * Cache-first data fetching pattern
 */
export async function cacheFirst<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 300
): Promise<T> {
  return cache.getOrSet(key, fetchFn, { ttl });
}

/**
 * Performance-optimized API handler factory
 */
export function createOptimizedHandler<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  options: {
    routeName: string;
    cacheKey?: (request: NextRequest) => string;
    cacheTTL?: number;
    rateLimit?: number;
  }
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const start = Date.now();

    try {
      // Check cache if cache key is provided
      if (options.cacheKey && request.method === 'GET') {
        const cacheKey = options.cacheKey(request);
        const cached = await cache.get<T>(cacheKey);

        if (cached !== null) {
          performanceMonitor.recordApiResponseTime(
            options.routeName,
            request.method,
            Date.now() - start,
            200
          );

          return NextResponse.json(cached, {
            headers: {
              'X-Cache': 'HIT',
              'X-Response-Time': `${Date.now() - start}ms`,
            },
          });
        }
      }

      // Execute handler
      const response = await handler(request);

      // Cache successful GET responses
      if (options.cacheKey &&
        request.method === 'GET' &&
        response.status === 200) {
        const cacheKey = options.cacheKey(request);
        const responseData = await response.clone().json();
        await cache.set(cacheKey, responseData, { ttl: options.cacheTTL || 300 });
      }

      // Record performance metrics
      const duration = Date.now() - start;
      performanceMonitor.recordApiResponseTime(
        options.routeName,
        request.method,
        duration,
        response.status
      );

      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Cache', 'MISS');

      return response;

    } catch (error) {
      const duration = Date.now() - start;
      performanceMonitor.recordApiResponseTime(
        options.routeName,
        request.method,
        duration,
        500
      );

      throw error;
    }
  };
}

/**
 * Lazy loading utility for components
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>
) {
  // Note: This function should be used in TSX files
  // Return the import function for use with React.lazy
  return importFn;
}

/**
 * Performance monitoring configuration for React components
 * Note: Use this in TSX files with proper React hooks
 */
export function createPerformanceTracker(componentName: string) {
  return {
    componentName,
    start: Date.now(),
    end: () => {
      const duration = Date.now() - Date.now();
      performanceMonitor.recordMetric('component_render_time', duration, {
        component: componentName,
      });
    }
  };
}

/**
 * Image optimization utility
 */
export function optimizeImageUrl(
  src: string,
  width?: number,
  height?: number,
  quality = 75
): string {
  if (!src) return '';

  // For Next.js Image optimization
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

export default {
  performanceMiddlewareNext,
  withPerformanceMonitoring,
  withDatabaseOptimization,
  withBatchOptimization,
  cacheFirst,
  createOptimizedHandler,
  createLazyComponent,
  createPerformanceTracker,
  optimizeImageUrl,
};