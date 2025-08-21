import { performanceMonitor } from './performance-monitor';
import { cache } from './cache';

export interface ScalingRule {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt';
  action: 'scale_up' | 'scale_down';
  cooldown: number; // seconds
  enabled: boolean;
}

export interface ScalingAction {
  type: 'database_connections' | 'cache_memory' | 'worker_processes';
  direction: 'up' | 'down';
  amount: number;
  timestamp: number;
}

export class AutoScaler {
  private rules: ScalingRule[] = [];
  private lastActions: Map<string, number> = new Map();
  private currentLimits = {
    maxDatabaseConnections: 20,
    maxCacheMemory: 512 * 1024 * 1024, // 512MB
    maxWorkerProcesses: 4,
  };

  constructor() {
    this.setupDefaultRules();
    this.startMonitoring();
  }

  /**
   * Add scaling rule
   */
  addRule(rule: ScalingRule) {
    this.rules.push(rule);
  }

  /**
   * Setup default scaling rules
   */
  private setupDefaultRules() {
    this.rules = [
      // Scale up database connections when query time is high
      {
        metric: 'db_query_time',
        threshold: 1000, // 1 second
        operator: 'gt',
        action: 'scale_up',
        cooldown: 300, // 5 minutes
        enabled: true,
      },
      // Scale down when query time is consistently low
      {
        metric: 'db_query_time',
        threshold: 100, // 100ms
        operator: 'lt',
        action: 'scale_down',
        cooldown: 600, // 10 minutes
        enabled: true,
      },
      // Scale up when memory usage is high
      {
        metric: 'memory_heap_used',
        threshold: 800 * 1024 * 1024, // 800MB
        operator: 'gt',
        action: 'scale_up',
        cooldown: 180, // 3 minutes
        enabled: true,
      },
      // Scale up when cache hit rate is low
      {
        metric: 'cache_hit_rate',
        threshold: 0.7, // 70%
        operator: 'lt',
        action: 'scale_up',
        cooldown: 300, // 5 minutes
        enabled: true,
      },
    ];
  }

  /**
   * Start monitoring and auto-scaling
   */
  private startMonitoring() {
    // Check scaling conditions every minute
    setInterval(() => {
      this.evaluateScalingRules();
    }, 60000);

    // Log current limits every 5 minutes
    setInterval(() => {
      console.log('Current scaling limits:', this.currentLimits);
    }, 300000);
  }

  /**
   * Evaluate all scaling rules
   */
  private async evaluateScalingRules() {
    for (const rule of this.rules.filter(r => r.enabled)) {
      await this.evaluateRule(rule);
    }
  }

  /**
   * Evaluate a single scaling rule
   */
  private async evaluateRule(rule: ScalingRule) {
    try {
      const ruleKey = `${rule.metric}_${rule.action}`;
      const lastAction = this.lastActions.get(ruleKey) || 0;
      const now = Date.now();

      // Check cooldown period
      if (now - lastAction < rule.cooldown * 1000) {
        return;
      }

      // Get recent metrics (last 5 minutes)
      const metrics = performanceMonitor.getAggregatedMetrics(
        rule.metric,
        now - 300000
      );

      if (metrics.count === 0) {
        return;
      }

      // Use average value for evaluation
      const shouldScale = this.evaluateCondition(rule, metrics.avg);

      if (shouldScale) {
        await this.executeScalingAction(rule, metrics.avg);
        this.lastActions.set(ruleKey, now);
      }
    } catch (error) {
      console.error('Error evaluating scaling rule:', error);
    }
  }

  /**
   * Evaluate scaling condition
   */
  private evaluateCondition(rule: ScalingRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Execute scaling action
   */
  private async executeScalingAction(rule: ScalingRule, currentValue: number) {
    const action: ScalingAction = {
      type: this.getScalingType(rule.metric),
      direction: rule.action === 'scale_up' ? 'up' : 'down',
      amount: this.getScalingAmount(rule.metric, rule.action),
      timestamp: Date.now(),
    };

    console.log(
      `🔄 Auto-scaling: ${action.type} ${action.direction} by ${action.amount} ` +
      `(${rule.metric}: ${currentValue} ${rule.operator} ${rule.threshold})`
    );

    switch (action.type) {
      case 'database_connections':
        await this.scaleDatabaseConnections(action);
        break;
      case 'cache_memory':
        await this.scaleCacheMemory(action);
        break;
      case 'worker_processes':
        await this.scaleWorkerProcesses(action);
        break;
    }

    // Record scaling action as metric
    performanceMonitor.recordMetric('scaling_actions', 1, {
      type: action.type,
      direction: action.direction,
      metric: rule.metric,
    });

    // Store action in cache for monitoring
    await this.storeScalingAction(action);
  }

  /**
   * Get scaling type based on metric
   */
  private getScalingType(metric: string): ScalingAction['type'] {
    if (metric.includes('db_') || metric.includes('database')) {
      return 'database_connections';
    }
    if (metric.includes('cache')) {
      return 'cache_memory';
    }
    return 'worker_processes';
  }

  /**
   * Get scaling amount based on metric and action
   */
  private getScalingAmount(metric: string, action: string): number {
    const baseAmounts = {
      database_connections: action === 'scale_up' ? 5 : -2,
      cache_memory: action === 'scale_up' ? 128 * 1024 * 1024 : -64 * 1024 * 1024, // 128MB up, 64MB down
      worker_processes: action === 'scale_up' ? 1 : -1,
    };

    const type = this.getScalingType(metric);
    return baseAmounts[type];
  }

  /**
   * Scale database connections
   */
  private async scaleDatabaseConnections(action: ScalingAction) {
    const current = this.currentLimits.maxDatabaseConnections;
    const newLimit = Math.max(5, Math.min(50, current + action.amount));

    if (newLimit !== current) {
      this.currentLimits.maxDatabaseConnections = newLimit;

      // In a real implementation, you would update the database pool configuration
      console.log(`Database connections scaled from ${current} to ${newLimit}`);

      // Store new limit in cache for other instances
      await cache.set('scaling:db_connections', newLimit, { ttl: 3600 });
    }
  }

  /**
   * Scale cache memory
   */
  private async scaleCacheMemory(action: ScalingAction) {
    const current = this.currentLimits.maxCacheMemory;
    const newLimit = Math.max(
      256 * 1024 * 1024, // Min 256MB
      Math.min(2 * 1024 * 1024 * 1024, current + action.amount) // Max 2GB
    );

    if (newLimit !== current) {
      this.currentLimits.maxCacheMemory = newLimit;

      console.log(
        `Cache memory scaled from ${Math.round(current / 1024 / 1024)}MB to ${Math.round(newLimit / 1024 / 1024)}MB`
      );

      // Store new limit in cache
      await cache.set('scaling:cache_memory', newLimit, { ttl: 3600 });

      // Trigger cache cleanup if scaling down
      if (action.direction === 'down') {
        await this.cleanupCache();
      }
    }
  }

  /**
   * Scale worker processes (placeholder)
   */
  private async scaleWorkerProcesses(action: ScalingAction) {
    const current = this.currentLimits.maxWorkerProcesses;
    const newLimit = Math.max(1, Math.min(8, current + action.amount));

    if (newLimit !== current) {
      this.currentLimits.maxWorkerProcesses = newLimit;

      console.log(`Worker processes scaled from ${current} to ${newLimit}`);

      // In a real implementation, you would spawn/kill worker processes
      await cache.set('scaling:worker_processes', newLimit, { ttl: 3600 });
    }
  }

  /**
   * Cleanup cache when scaling down
   */
  private async cleanupCache() {
    try {
      // Remove expired keys
      const keys = await cache.clearPattern('*:expired');
      console.log(`Cleaned up ${keys} expired cache keys`);

      // Clear least recently used items (simplified)
      await cache.clearPattern('cache:temp:*');
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Store scaling action for monitoring
   */
  private async storeScalingAction(action: ScalingAction) {
    const key = `scaling:actions:${Date.now()}`;
    await cache.set(key, action, { ttl: 86400 }); // Keep for 24 hours
  }

  /**
   * Get scaling history
   */
  async getScalingHistory(hours = 24): Promise<ScalingAction[]> {
    try {
      const since = Date.now() - (hours * 60 * 60 * 1000);
      const pattern = 'scaling:actions:*';

      // This is a simplified implementation
      // In production, you'd want a more efficient way to query time-based data
      const actions: ScalingAction[] = [];

      return actions.filter(action => action.timestamp >= since);
    } catch (error) {
      console.error('Error fetching scaling history:', error);
      return [];
    }
  }

  /**
   * Get current scaling status
   */
  getScalingStatus() {
    return {
      limits: this.currentLimits,
      rules: this.rules.filter(r => r.enabled),
      lastActions: Object.fromEntries(this.lastActions),
    };
  }

  /**
   * Enable/disable auto-scaling
   */
  setEnabled(enabled: boolean) {
    this.rules.forEach(rule => {
      rule.enabled = enabled;
    });

    console.log(`Auto-scaling ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
export const autoScaler = new AutoScaler();

export default autoScaler;