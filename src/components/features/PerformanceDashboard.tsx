'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface PerformanceMetrics {
  healthScore: number;
  metrics: {
    apiMetrics: {
      responseTime: { avg: number; p95: number; p99: number; count: number };
      errorCount: { count: number };
    };
    dbMetrics: {
      queryTime: { avg: number; p95: number; p99: number; count: number };
      errorCount: { count: number };
    };
    systemMetrics: {
      memory: { avg: number; max: number };
      cpu: { avg: number };
    };
    cacheMetrics: {
      hitRate: { avg: number };
      keys: { avg: number };
    };
  };
  scaling: {
    status: {
      limits: {
        maxDatabaseConnections: number;
        maxCacheMemory: number;
        maxWorkerProcesses: number;
      };
    };
    history: Array<{
      type: string;
      direction: string;
      amount: number;
      timestamp: number;
    }>;
  };
  cache: {
    memory: string;
    keys: number;
    hits: number;
    misses: number;
  };
  system: {
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  };
  recommendations: string[];
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(3600000); // 1 hour
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/monitoring/dashboard?timeRange=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6 text-center">
        <div className="text-red-500 mb-4">⚠️ Error loading dashboard</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <GlassButton onClick={fetchData}>Retry</GlassButton>
      </GlassCard>
    );
  }

  if (!data) return null;

  const cacheHitRate = data.cache.hits + data.cache.misses > 0
    ? (data.cache.hits / (data.cache.hits + data.cache.misses) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Performance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
          >
            <option value={3600000}>Last Hour</option>
            <option value={21600000}>Last 6 Hours</option>
            <option value={86400000}>Last 24 Hours</option>
            <option value={604800000}>Last Week</option>
          </select>
          <GlassButton
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-500/20' : 'bg-gray-500/20'}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
          </GlassButton>
          <GlassButton onClick={fetchData}>
            🔄 Refresh
          </GlassButton>
        </div>
      </div>

      {/* Health Score */}
      <GlassCard className="p-6">
        <div className="text-center">
          <div className={`text-6xl font-bold ${getHealthColor(data.healthScore)} mb-2`}>
            {data.healthScore}
          </div>
          <div className="text-xl text-gray-300 mb-2">
            System Health: {getHealthStatus(data.healthScore)}
          </div>
          <div className="text-sm text-gray-400">
            Overall performance score based on API, database, memory, and cache metrics
          </div>
        </div>
      </GlassCard>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* API Metrics */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🌐 API Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Response Time:</span>
              <span className="text-white font-mono">
                {data.metrics.apiMetrics.responseTime.avg.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">95th Percentile:</span>
              <span className="text-white font-mono">
                {data.metrics.apiMetrics.responseTime.p95.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Total Requests:</span>
              <span className="text-white font-mono">
                {data.metrics.apiMetrics.responseTime.count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Errors:</span>
              <span className={`font-mono ${data.metrics.apiMetrics.errorCount.count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.metrics.apiMetrics.errorCount.count}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Database Metrics */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🗄️ Database Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Query Time:</span>
              <span className="text-white font-mono">
                {data.metrics.dbMetrics.queryTime.avg.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">95th Percentile:</span>
              <span className="text-white font-mono">
                {data.metrics.dbMetrics.queryTime.p95.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Total Queries:</span>
              <span className="text-white font-mono">
                {data.metrics.dbMetrics.queryTime.count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Connections:</span>
              <span className="text-white font-mono">
                {data.scaling.status.limits.maxDatabaseConnections}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* System Metrics */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💻 System Resources</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Memory Used:</span>
              <span className="text-white font-mono">
                {formatBytes(data.system.memory.heapUsed)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Memory Total:</span>
              <span className="text-white font-mono">
                {formatBytes(data.system.memory.heapTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Memory Usage:</span>
              <span className="text-white font-mono">
                {((data.system.memory.heapUsed / data.system.memory.heapTotal) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Uptime:</span>
              <span className="text-white font-mono">
                {formatUptime(data.system.uptime)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Cache Metrics */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">⚡ Cache Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Hit Rate:</span>
              <span className={`font-mono ${parseFloat(cacheHitRate) > 80 ? 'text-green-400' : parseFloat(cacheHitRate) > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {cacheHitRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Total Keys:</span>
              <span className="text-white font-mono">{data.cache.keys}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Cache Hits:</span>
              <span className="text-green-400 font-mono">{data.cache.hits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Cache Misses:</span>
              <span className="text-red-400 font-mono">{data.cache.misses}</span>
            </div>
          </div>
        </GlassCard>

        {/* Auto-scaling Status */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Auto-scaling</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">DB Connections:</span>
              <span className="text-white font-mono">
                {data.scaling.status.limits.maxDatabaseConnections}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Cache Memory:</span>
              <span className="text-white font-mono">
                {formatBytes(data.scaling.status.limits.maxCacheMemory)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Worker Processes:</span>
              <span className="text-white font-mono">
                {data.scaling.status.limits.maxWorkerProcesses}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Recent Actions:</span>
              <span className="text-white font-mono">
                {data.scaling.history.length}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Recent Scaling Actions */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔄 Recent Scaling</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.scaling.history.length > 0 ? (
              data.scaling.history.slice(0, 5).map((action, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">
                      {action.type.replace('_', ' ')}
                    </span>
                    <span className={`font-mono ${action.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                      {action.direction === 'up' ? '↗️' : '↘️'} {Math.abs(action.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No recent scaling actions</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💡 Recommendations</h3>
          <ul className="space-y-2">
            {data.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-gray-300">{recommendation}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

export default PerformanceDashboard;