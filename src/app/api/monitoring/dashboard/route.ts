import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { autoScaler } from '@/lib/auto-scaling';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000'); // Default 1 hour

    // Get performance metrics
    const dashboardData = await performanceMonitor.getDashboardData(timeRange);

    // Get auto-scaling status
    const scalingStatus = autoScaler.getScalingStatus();
    const scalingHistory = await autoScaler.getScalingHistory(24);

    // Get cache statistics
    const cacheStats = await cache.getStats();

    // Get system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    // Calculate overall health score
    const healthScore = calculateOverallHealth(dashboardData, cacheStats, systemInfo);

    return NextResponse.json({
      success: true,
      data: {
        healthScore,
        metrics: dashboardData,
        scaling: {
          status: scalingStatus,
          history: scalingHistory,
        },
        cache: cacheStats,
        system: systemInfo,
        recommendations: generateRecommendations(dashboardData, cacheStats, systemInfo),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function calculateOverallHealth(
  metrics: any,
  cacheStats: any,
  systemInfo: any
): number {
  let score = 100;

  // API performance (30% weight)
  if (metrics.apiMetrics.responseTime.count > 0) {
    const avgResponseTime = metrics.apiMetrics.responseTime.avg;
    if (avgResponseTime > 2000) score -= 15; // Very slow
    else if (avgResponseTime > 1000) score -= 10; // Slow
    else if (avgResponseTime > 500) score -= 5; // Acceptable
  }

  // Database performance (25% weight)
  if (metrics.dbMetrics.queryTime.count > 0) {
    const avgQueryTime = metrics.dbMetrics.queryTime.avg;
    if (avgQueryTime > 1000) score -= 12; // Very slow
    else if (avgQueryTime > 500) score -= 8; // Slow
    else if (avgQueryTime > 200) score -= 4; // Acceptable
  }

  // Memory usage (20% weight)
  const memoryUsage = systemInfo.memory.heapUsed / systemInfo.memory.heapTotal;
  if (memoryUsage > 0.9) score -= 10; // Critical
  else if (memoryUsage > 0.8) score -= 6; // High
  else if (memoryUsage > 0.7) score -= 3; // Moderate

  // Cache performance (15% weight)
  const totalCacheRequests = cacheStats.hits + cacheStats.misses;
  if (totalCacheRequests > 0) {
    const hitRate = cacheStats.hits / totalCacheRequests;
    if (hitRate < 0.5) score -= 8; // Poor
    else if (hitRate < 0.7) score -= 5; // Fair
    else if (hitRate < 0.9) score -= 2; // Good
  }

  // Error rates (10% weight)
  if (metrics.apiMetrics.errorCount.count > 0) {
    const errorRate = metrics.apiMetrics.errorCount.count /
      (metrics.apiMetrics.responseTime.count || 1);
    if (errorRate > 0.1) score -= 5; // High error rate
    else if (errorRate > 0.05) score -= 3; // Moderate error rate
    else if (errorRate > 0.01) score -= 1; // Low error rate
  }

  return Math.max(0, Math.round(score));
}

function generateRecommendations(
  metrics: any,
  cacheStats: any,
  systemInfo: any
): string[] {
  const recommendations: string[] = [];

  // API performance recommendations
  if (metrics.apiMetrics.responseTime.avg > 1000) {
    recommendations.push('Consider optimizing API endpoints with slow response times');
    recommendations.push('Implement request caching for frequently accessed data');
  }

  // Database recommendations
  if (metrics.dbMetrics.queryTime.avg > 500) {
    recommendations.push('Review and optimize slow database queries');
    recommendations.push('Consider adding database indexes for frequently queried fields');
  }

  // Memory recommendations
  const memoryUsage = systemInfo.memory.heapUsed / systemInfo.memory.heapTotal;
  if (memoryUsage > 0.8) {
    recommendations.push('High memory usage detected - consider increasing available memory');
    recommendations.push('Review memory leaks and optimize object lifecycle management');
  }

  // Cache recommendations
  const totalCacheRequests = cacheStats.hits + cacheStats.misses;
  if (totalCacheRequests > 0) {
    const hitRate = cacheStats.hits / totalCacheRequests;
    if (hitRate < 0.7) {
      recommendations.push('Low cache hit rate - review caching strategy and TTL values');
      recommendations.push('Consider pre-warming cache for frequently accessed data');
    }
  }

  // Error rate recommendations
  if (metrics.apiMetrics.errorCount.count > 0) {
    const errorRate = metrics.apiMetrics.errorCount.count /
      (metrics.apiMetrics.responseTime.count || 1);
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected - review error logs and fix issues');
      recommendations.push('Implement better error handling and retry mechanisms');
    }
  }

  // Scaling recommendations
  if (recommendations.length === 0) {
    recommendations.push('System performance is optimal');
    recommendations.push('Continue monitoring for any performance degradation');
  }

  return recommendations;
}