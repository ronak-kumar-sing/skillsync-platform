import { PrismaClient } from '@prisma/client';
import { performanceMonitor } from './performance-monitor';

export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

export class DatabasePoolOptimizer {
  private prisma: PrismaClient;
  private config: PoolConfig;
  private metrics = {
    activeConnections: 0,
    totalQueries: 0,
    slowQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.config = this.getOptimalPoolConfig();
    this.startMonitoring();
  }

  /**
   * Get optimal pool configuration based on environment
   */
  private getOptimalPoolConfig(): PoolConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const cpuCount = require('os').cpus().length;

    return {
      min: isProduction ? 2 : 1,
      max: isProduction ? Math.max(cpuCount * 2, 10) : 5,
      acquireTimeoutMillis: 30000, // 30 seconds
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 10000, // 10 seconds
    };
  }

  /**
   * Execute query with performance monitoring
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;

    try {
      this.metrics.activeConnections++;
      this.metrics.totalQueries++;

      const result = await queryFn();

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(queryName, duration, true);

      return result;
    } catch (error) {
      success = false;
      this.metrics.failedQueries++;

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(queryName, duration, false);

      throw error;
    } finally {
      this.metrics.activeConnections--;
    }
  }

  /**
   * Update query performance metrics
   */
  private updateQueryMetrics(queryName: string, duration: number, success: boolean) {
    // Record in performance monitor
    performanceMonitor.recordDatabaseQuery(queryName, duration, success);

    // Update internal metrics
    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.slowQueries++;
    }

    // Update average query time (simple moving average)
    this.metrics.avgQueryTime =
      (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + duration) /
      this.metrics.totalQueries;
  }

  /**
   * Optimize query with caching and connection reuse
   */
  async optimizedQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    cacheTTL = 300
  ): Promise<T> {
    // If cache key provided, try cache first
    if (cacheKey) {
      const { cache } = await import('./cache');
      const cached = await cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute query with monitoring
    const result = await this.executeQuery(queryFn, cacheKey || 'unknown');

    // Cache result if cache key provided
    if (cacheKey) {
      const { cache } = await import('./cache');
      await cache.set(cacheKey, result, { ttl: cacheTTL });
    }

    return result;
  }

  /**
   * Batch execute multiple queries efficiently
   */
  async batchExecute<T>(
    queries: Array<{
      fn: () => Promise<T>;
      name: string;
      cacheKey?: string;
      cacheTTL?: number;
    }>
  ): Promise<T[]> {
    // Group queries by cache availability
    const cachedQueries: typeof queries = [];
    const freshQueries: typeof queries = [];

    for (const query of queries) {
      if (query.cacheKey) {
        cachedQueries.push(query);
      } else {
        freshQueries.push(query);
      }
    }

    // Execute cached queries first
    const cachedResults = await Promise.all(
      cachedQueries.map(query =>
        this.optimizedQuery(query.fn, query.cacheKey, query.cacheTTL)
      )
    );

    // Execute fresh queries in parallel (with connection limit)
    const batchSize = Math.min(this.config.max / 2, 5); // Use half of max connections
    const freshResults: T[] = [];

    for (let i = 0; i < freshQueries.length; i += batchSize) {
      const batch = freshQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(query => this.executeQuery(query.fn, query.name))
      );
      freshResults.push(...batchResults);
    }

    // Combine results in original order
    const results: T[] = [];
    let cachedIndex = 0;
    let freshIndex = 0;

    for (const query of queries) {
      if (query.cacheKey) {
        results.push(cachedResults[cachedIndex++]);
      } else {
        results.push(freshResults[freshIndex++]);
      }
    }

    return results;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return {
      config: this.config,
      metrics: this.metrics,
      healthScore: this.calculateHealthScore(),
    };
  }

  /**
   * Calculate database health score (0-100)
   */
  private calculateHealthScore(): number {
    let score = 100;

    // Penalize high failure rate
    if (this.metrics.totalQueries > 0) {
      const failureRate = this.metrics.failedQueries / this.metrics.totalQueries;
      score -= failureRate * 50;
    }

    // Penalize slow queries
    if (this.metrics.totalQueries > 0) {
      const slowQueryRate = this.metrics.slowQueries / this.metrics.totalQueries;
      score -= slowQueryRate * 30;
    }

    // Penalize high average query time
    if (this.metrics.avgQueryTime > 500) {
      score -= Math.min(20, (this.metrics.avgQueryTime - 500) / 100);
    }

    // Penalize high connection usage
    const connectionUsage = this.metrics.activeConnections / this.config.max;
    if (connectionUsage > 0.8) {
      score -= (connectionUsage - 0.8) * 50;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Start monitoring and optimization
   */
  private startMonitoring() {
    // Log pool statistics every 5 minutes
    setInterval(() => {
      const stats = this.getPoolStats();
      console.log('Database Pool Stats:', {
        healthScore: stats.healthScore,
        activeConnections: stats.metrics.activeConnections,
        totalQueries: stats.metrics.totalQueries,
        avgQueryTime: Math.round(stats.metrics.avgQueryTime),
        failureRate: stats.metrics.totalQueries > 0
          ? Math.round((stats.metrics.failedQueries / stats.metrics.totalQueries) * 100)
          : 0,
      });

      // Record metrics for monitoring
      performanceMonitor.recordMetric('db_pool_health', stats.healthScore);
      performanceMonitor.recordMetric('db_active_connections', stats.metrics.activeConnections);
      performanceMonitor.recordMetric('db_avg_query_time', stats.metrics.avgQueryTime);
    }, 300000);

    // Reset metrics daily
    setInterval(() => {
      this.metrics = {
        activeConnections: this.metrics.activeConnections, // Keep current connections
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
        avgQueryTime: 0,
      };
    }, 86400000); // 24 hours
  }

  /**
   * Optimize database configuration based on current metrics
   */
  async optimizeConfiguration() {
    const stats = this.getPoolStats();

    if (stats.healthScore < 70) {
      console.log('🔧 Database performance degraded, optimizing configuration...');

      // Increase pool size if connection usage is high
      const connectionUsage = this.metrics.activeConnections / this.config.max;
      if (connectionUsage > 0.8 && this.config.max < 20) {
        this.config.max = Math.min(20, this.config.max + 2);
        console.log(`Increased max connections to ${this.config.max}`);
      }

      // Decrease idle timeout if we have many slow queries
      if (this.metrics.slowQueries / this.metrics.totalQueries > 0.1) {
        this.config.idleTimeoutMillis = Math.max(60000, this.config.idleTimeoutMillis - 30000);
        console.log(`Decreased idle timeout to ${this.config.idleTimeoutMillis}ms`);
      }
    }
  }
}

export default DatabasePoolOptimizer;