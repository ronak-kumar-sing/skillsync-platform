import { NextRequest, NextResponse } from 'next/server';
import { QueueCleanupService } from '@/services/queue-cleanup.service';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/matching/queue/cleanup - Force queue cleanup (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check when user roles are implemented
    // For now, any authenticated user can trigger cleanup

    const result = await QueueCleanupService.forceCleanup();

    return NextResponse.json({
      success: true,
      result,
      message: `Cleanup completed: ${result.expiredEntries} expired entries and ${result.orphanedKeys} orphaned keys removed in ${result.duration}ms`,
    });
  } catch (error) {
    console.error('Error during forced cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/matching/queue/cleanup - Get cleanup service health
 */
export async function GET(request: NextRequest) {
  try {
    const healthStatus = await QueueCleanupService.getHealthStatus();

    return NextResponse.json({
      success: true,
      health: healthStatus,
    });
  } catch (error) {
    console.error('Error getting cleanup health:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup health status' },
      { status: 500 }
    );
  }
}