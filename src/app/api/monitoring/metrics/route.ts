import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000'); // Default 1 hour
    const format = searchParams.get('format') || 'json';

    const dashboardData = await performanceMonitor.getDashboardData(timeRange);

    if (format === 'prometheus') {
      // Return Prometheus format for external monitoring systems
      const prometheusMetrics = formatPrometheusMetrics(dashboardData);
      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

function formatPrometheusMetrics(data: any): string {
  const metrics: string[] = [];

  // API metrics
  if (data.apiMetrics.responseTime.count > 0) {
    metrics.push(`# HELP api_response_time_avg Average API response time in milliseconds`);
    metrics.push(`# TYPE api_response_time_avg gauge`);
    metrics.push(`api_response_time_avg ${data.apiMetrics.responseTime.avg}`);

    metrics.push(`# HELP api_response_time_p95 95th percentile API response time`);
    metrics.push(`# TYPE api_response_time_p95 gauge`);
    metrics.push(`api_response_time_p95 ${data.apiMetrics.responseTime.p95}`);
  }

  // Database metrics
  if (data.dbMetrics.queryTime.count > 0) {
    metrics.push(`# HELP db_query_time_avg Average database query time in milliseconds`);
    metrics.push(`# TYPE db_query_time_avg gauge`);
    metrics.push(`db_query_time_avg ${data.dbMetrics.queryTime.avg}`);
  }

  // System metrics
  if (data.systemMetrics.memory.count > 0) {
    metrics.push(`# HELP memory_heap_used_bytes Memory heap usage in bytes`);
    metrics.push(`# TYPE memory_heap_used_bytes gauge`);
    metrics.push(`memory_heap_used_bytes ${data.systemMetrics.memory.avg}`);
  }

  // Cache metrics
  if (data.cacheMetrics.hitRate.count > 0) {
    metrics.push(`# HELP cache_hit_rate Cache hit rate ratio`);
    metrics.push(`# TYPE cache_hit_rate gauge`);
    metrics.push(`cache_hit_rate ${data.cacheMetrics.hitRate.avg}`);
  }

  return metrics.join('\n') + '\n';
}