import { cache } from './cache';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface AlertRule {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  duration: number; // seconds
  action: 'log' | 'email' | 'webhook';
  enabled: boolean;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: AlertRule[] = [];
  private alertStates: Map<string, { triggered: boolean; since: number }> = new Map();

  constructor() {
    this.setupDefaultAlerts();
    this.startMetricsCollection();
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Store in Redis for persistence
    this.storeMetricInRedis(metric);

    // Check alerts
    this.checkAlerts(name, value);
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string, since?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];

    if (since) {
      return metrics.filter(m => m.timestamp >= since);
    }

    return metrics;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, since?: number): {
    avg: number;
    min: number;
    max: number;
    count: number;
    p95: number;
    p99: number;
  } {
    const metrics = this.getMetrics(name, since);

    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, p95: 0, p99: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      count: values.length,
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  /**
   * Record API response time
   */
  recordApiResponseTime(endpoint: string, method: string, duration: number, statusCode: number) {
    this.recordMetric('api_response_time', duration, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.recordMetric('api_error_count', 1, {
        endpoint,
        method,
        status: statusCode.toString(),
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(query: string, duration: number, success: boolean) {
    this.recordMetric('db_query_time', duration, {
      query: query.substring(0, 50), // Truncate for privacy
      success: success.toString(),
    });

    if (!success) {
      this.recordMetric('db_error_count', 1, { query: query.substring(0, 50) });
    }
  }

  /**
   * Record WebSocket connection metrics
   */
  recordWebSocketMetric(event: string, count: number) {
    this.recordMetric('websocket_connections', count, { event });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    const usage = process.memoryUsage();

    this.recordMetric('memory_heap_used', usage.heapUsed);
    this.recordMetric('memory_heap_total', usage.heapTotal);
    this.recordMetric('memory_rss', usage.rss);
    this.recordMetric('memory_external', usage.external);
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage() {
    const usage = process.cpuUsage();
    this.recordMetric('cpu_user', usage.user);
    this.recordMetric('cpu_system', usage.system);
  }

  /**
   * Add alert rule
   */
  addAlert(rule: AlertRule) {
    this.alerts.push(rule);
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlerts() {
    this.alerts = [
      {
        metric: 'api_response_time',
        threshold: 2000, // 2 seconds
        operator: 'gt',
        duration: 60, // 1 minute
        action: 'log',
        enabled: true,
      },
      {
        metric: 'memory_heap_used',
        threshold: 1024 * 1024 * 1024, // 1GB
        operator: 'gt',
        duration: 300, // 5 minutes
        action: 'log',
        enabled: true,
      },
      {
        metric: 'db_query_time',
        threshold: 1000, // 1 second
        operator: 'gt',
        duration: 30, // 30 seconds
        action: 'log',
        enabled: true,
      },
      {
        metric: 'api_error_count',
        threshold: 10,
        operator: 'gt',
        duration: 60, // 1 minute
        action: 'log',
        enabled: true,
      },
    ];
  }

  /**
   * Check alert conditions
   */
  private checkAlerts(metricName: string, value: number) {
    const relevantAlerts = this.alerts.filter(
      alert => alert.metric === metricName && alert.enabled
    );

    for (const alert of relevantAlerts) {
      const alertKey = `${alert.metric}_${alert.threshold}_${alert.operator}`;
      const shouldTrigger = this.evaluateAlertCondition(alert, value);
      const currentState = this.alertStates.get(alertKey);

      if (shouldTrigger) {
        if (!currentState?.triggered) {
          // New alert
          this.alertStates.set(alertKey, {
            triggered: true,
            since: Date.now(),
          });
          this.triggerAlert(alert, value);
        } else if (Date.now() - currentState.since >= alert.duration * 1000) {
          // Alert has been active for the required duration
          this.triggerAlert(alert, value);
        }
      } else if (currentState?.triggered) {
        // Alert resolved
        this.alertStates.set(alertKey, {
          triggered: false,
          since: Date.now(),
        });
        this.resolveAlert(alert, value);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(alert: AlertRule, value: number): boolean {
    switch (alert.operator) {
      case 'gt':
        return value > alert.threshold;
      case 'lt':
        return value < alert.threshold;
      case 'eq':
        return value === alert.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert action
   */
  private triggerAlert(alert: AlertRule, value: number) {
    const message = `Alert: ${alert.metric} ${alert.operator} ${alert.threshold} (current: ${value})`;

    switch (alert.action) {
      case 'log':
        console.warn(`🚨 ${message}`);
        break;
      case 'email':
        // Implement email notification
        this.sendEmailAlert(message);
        break;
      case 'webhook':
        // Implement webhook notification
        this.sendWebhookAlert(alert, value);
        break;
    }
  }

  /**
   * Resolve alert
   */
  private resolveAlert(alert: AlertRule, value: number) {
    const message = `Resolved: ${alert.metric} back to normal (current: ${value})`;
    console.info(`✅ ${message}`);
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(message: string) {
    // Implement email sending logic
    console.log('Email alert:', message);
  }

  /**
   * Send webhook alert (placeholder)
   */
  private async sendWebhookAlert(alert: AlertRule, value: number) {
    // Implement webhook sending logic
    console.log('Webhook alert:', { alert, value });
  }

  /**
   * Store metric in Redis for persistence
   */
  private async storeMetricInRedis(metric: PerformanceMetric) {
    try {
      const key = `metrics:${metric.name}:${Math.floor(metric.timestamp / 60000)}`; // Group by minute
      await cache.set(key, metric, { ttl: 86400 }); // Keep for 24 hours
    } catch (error) {
      console.error('Failed to store metric in Redis:', error);
    }
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage();
      this.recordCpuUsage();
    }, 30000);

    // Collect cache metrics every minute
    setInterval(async () => {
      try {
        const stats = await cache.getStats();
        this.recordMetric('cache_memory', parseInt(stats.memory.replace(/[^\d]/g, '')));
        this.recordMetric('cache_keys', stats.keys);
        this.recordMetric('cache_hits', stats.hits);
        this.recordMetric('cache_misses', stats.misses);

        if (stats.hits + stats.misses > 0) {
          const hitRate = stats.hits / (stats.hits + stats.misses);
          this.recordMetric('cache_hit_rate', hitRate);
        }
      } catch (error) {
        console.error('Failed to collect cache metrics:', error);
      }
    }, 60000);
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(timeRange: number = 3600000): Promise<{
    apiMetrics: any;
    dbMetrics: any;
    systemMetrics: any;
    cacheMetrics: any;
    alerts: any[];
  }> {
    const since = Date.now() - timeRange;

    return {
      apiMetrics: {
        responseTime: this.getAggregatedMetrics('api_response_time', since),
        errorCount: this.getAggregatedMetrics('api_error_count', since),
      },
      dbMetrics: {
        queryTime: this.getAggregatedMetrics('db_query_time', since),
        errorCount: this.getAggregatedMetrics('db_error_count', since),
      },
      systemMetrics: {
        memory: this.getAggregatedMetrics('memory_heap_used', since),
        cpu: this.getAggregatedMetrics('cpu_user', since),
      },
      cacheMetrics: {
        hitRate: this.getAggregatedMetrics('cache_hit_rate', since),
        keys: this.getAggregatedMetrics('cache_keys', since),
      },
      alerts: Array.from(this.alertStates.entries()).map(([key, state]) => ({
        key,
        ...state,
      })),
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware for Express.js to automatically track API performance
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      performanceMonitor.recordApiResponseTime(
        req.route?.path || req.path,
        req.method,
        duration,
        res.statusCode
      );
    });

    next();
  };
}

export default performanceMonitor;