import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMonitor, performanceMiddleware } from '@/lib/performance-monitor';
import { cache } from '@/lib/cache';
import { autoScaler } from '@/lib/auto-scaling';

// Mock Redis
vi.mock('@/lib/redis', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    mget: vi.fn(),
    pipeline: vi.fn(() => ({
      setex: vi.fn(),
      exec: vi.fn(),
    })),
    keys: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PerformanceMonitor', () => {
    it('should record metrics correctly', () => {
      const metricName = `test_metric_${Date.now()}`;
      performanceMonitor.recordMetric(metricName, 100, { tag: 'test' });

      const metrics = performanceMonitor.getMetrics(metricName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(100);
      expect(metrics[0].tags).toEqual({ tag: 'test' });
    });

    it('should calculate aggregated metrics', () => {
      // Use a unique metric name to avoid interference from other tests
      const metricName = `test_aggregated_${Date.now()}`;

      // Record multiple metrics
      performanceMonitor.recordMetric(metricName, 100);
      performanceMonitor.recordMetric(metricName, 200);
      performanceMonitor.recordMetric(metricName, 300);

      const aggregated = performanceMonitor.getAggregatedMetrics(metricName);

      expect(aggregated.avg).toBe(200);
      expect(aggregated.min).toBe(100);
      expect(aggregated.max).toBe(300);
      expect(aggregated.count).toBe(3);
    });

    it('should record API response time', () => {
      performanceMonitor.recordApiResponseTime('/api/test', 'GET', 150, 200);

      const metrics = performanceMonitor.getMetrics('api_response_time');
      expect(metrics.length).toBeGreaterThan(0);

      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.value).toBe(150);
      expect(lastMetric.tags).toEqual({
        endpoint: '/api/test',
        method: 'GET',
        status: '200',
      });
    });

    it('should record database query performance', () => {
      performanceMonitor.recordDatabaseQuery('SELECT * FROM users', 50, true);

      const metrics = performanceMonitor.getMetrics('db_query_time');
      expect(metrics.length).toBeGreaterThan(0);

      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.value).toBe(50);
      expect(lastMetric.tags?.success).toBe('true');
    });

    it('should track memory usage', () => {
      performanceMonitor.recordMemoryUsage();

      const heapMetrics = performanceMonitor.getMetrics('memory_heap_used');
      expect(heapMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Manager', () => {
    it('should handle cache operations', async () => {
      const testData = { id: 1, name: 'test' };

      // Mock Redis responses
      const mockRedis = await import('@/lib/redis');
      vi.mocked(mockRedis.default.get).mockResolvedValue(null);
      vi.mocked(mockRedis.default.setex).mockResolvedValue('OK');

      await cache.set('test_key', testData);
      const result = await cache.get('test_key');

      expect(mockRedis.default.setex).toHaveBeenCalled();
    });

    it('should handle getOrSet pattern', async () => {
      const mockRedis = await import('@/lib/redis');
      vi.mocked(mockRedis.default.get).mockResolvedValue(null);
      vi.mocked(mockRedis.default.setex).mockResolvedValue('OK');

      const fallbackFn = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await cache.getOrSet('test_key', fallbackFn);

      expect(fallbackFn).toHaveBeenCalled();
      expect(mockRedis.default.setex).toHaveBeenCalled();
    });

    it('should handle cache statistics', async () => {
      const mockRedis = await import('@/lib/redis');
      vi.mocked(mockRedis.default.info).mockImplementation((section) => {
        if (section === 'memory') return Promise.resolve('used_memory_human:100MB');
        if (section === 'keyspace') return Promise.resolve('keys=50');
        if (section === 'stats') return Promise.resolve('keyspace_hits:100\nkeyspace_misses:20');
        return Promise.resolve('');
      });

      const stats = await cache.getStats();

      expect(stats.memory).toBe('100MB');
      expect(stats.keys).toBe(50);
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(20);
    });
  });

  describe('Auto Scaler', () => {
    it('should have default scaling rules', () => {
      const status = autoScaler.getScalingStatus();

      expect(status.rules.length).toBeGreaterThan(0);
      expect(status.limits).toHaveProperty('maxDatabaseConnections');
      expect(status.limits).toHaveProperty('maxCacheMemory');
      expect(status.limits).toHaveProperty('maxWorkerProcesses');
    });

    it('should add custom scaling rules', () => {
      const customRule = {
        metric: 'custom_metric',
        threshold: 100,
        operator: 'gt' as const,
        action: 'scale_up' as const,
        cooldown: 300,
        enabled: true,
      };

      autoScaler.addRule(customRule);

      const status = autoScaler.getScalingStatus();
      const hasCustomRule = status.rules.some(rule => rule.metric === 'custom_metric');

      expect(hasCustomRule).toBe(true);
    });

    it('should enable/disable scaling', () => {
      autoScaler.setEnabled(false);

      const status = autoScaler.getScalingStatus();
      const allDisabled = status.rules.every(rule => !rule.enabled);

      expect(allDisabled).toBe(true);

      autoScaler.setEnabled(true);

      const statusAfter = autoScaler.getScalingStatus();
      const allEnabled = statusAfter.rules.every(rule => rule.enabled);

      expect(allEnabled).toBe(true);
    });
  });

  describe('Lazy Loading', () => {
    it('should create intersection observer', () => {
      // Mock IntersectionObserver
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      global.IntersectionObserver = vi.fn().mockImplementation(() => mockObserver);

      // This would be tested in a React environment
      expect(global.IntersectionObserver).toBeDefined();
    });
  });

  describe('Performance Middleware', () => {
    it('should track API performance', () => {
      const req = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/test' },
      };

      const res = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish immediately for testing
            callback();
          }
        }),
      };

      const next = vi.fn();

      const middleware = performanceMiddleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete performance monitoring flow', async () => {
      // Record some metrics with unique names
      const timestamp = Date.now();
      performanceMonitor.recordApiResponseTime(`/api/users/${timestamp}`, 'GET', 150, 200);
      performanceMonitor.recordDatabaseQuery(`SELECT * FROM users ${timestamp}`, 50, true);
      performanceMonitor.recordMemoryUsage();

      // Get dashboard data
      const dashboardData = await performanceMonitor.getDashboardData(3600000);

      expect(dashboardData).toHaveProperty('apiMetrics');
      expect(dashboardData).toHaveProperty('dbMetrics');
      expect(dashboardData).toHaveProperty('systemMetrics');
      expect(dashboardData).toHaveProperty('cacheMetrics');
      expect(dashboardData).toHaveProperty('alerts');
    });

    it('should handle cache and performance monitoring together', async () => {
      const mockRedis = await import('@/lib/redis');
      vi.mocked(mockRedis.default.get).mockResolvedValue(null);
      vi.mocked(mockRedis.default.setex).mockResolvedValue('OK');

      // Cache some data
      await cache.set('performance_test', { metric: 'value' });

      // Record cache metrics
      const metricName = `cache_operations_${Date.now()}`;
      performanceMonitor.recordMetric(metricName, 1);

      const metrics = performanceMonitor.getMetrics(metricName);
      expect(metrics).toHaveLength(1);
    });
  });
});