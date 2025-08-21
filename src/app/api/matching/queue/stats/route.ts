import { NextRequest, NextResponse } from 'next/server';
import { QueueManagerService } from '@/services/queue-manager.service';
import { QueueCleanupService } from '@/services/queue-cleanup.service';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/matching/queue/stats - Get comprehensive queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (optional for public stats)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let isAuthenticated = false;

    if (token) {
      const decoded = verifyToken(token);
      isAuthenticated = !!decoded;
    }

    // Get basic queue statistics
    const queueStats = await QueueManagerService.getQueueStats();

    // Get health status (only for authenticated users)
    let healthStatus = null;
    if (isAuthenticated) {
      healthStatus = await QueueCleanupService.getHealthStatus();
    }

    // Public statistics (safe to expose)
    const publicStats = {
      totalInQueue: queueStats.totalInQueue,
      bySessionType: queueStats.bySessionType,
      averageWaitTime: Math.round(queueStats.averageWaitTime),
      matchesPerHour: queueStats.matchesPerHour,
      queueHealth: healthStatus?.metrics?.queueHealth || null,
    };

    // Detailed statistics (only for authenticated users)
    const detailedStats = isAuthenticated ? {
      ...publicStats,
      byUrgency: queueStats.byUrgency,
      healthStatus,
      lastUpdated: Date.now(),
    } : publicStats;

    return NextResponse.json({
      success: true,
      stats: detailedStats,
      isDetailed: isAuthenticated,
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to get queue statistics' },
      { status: 500 }
    );
  }
}