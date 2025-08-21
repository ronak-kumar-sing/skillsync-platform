import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/sessions/active - Get user's active sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Get active sessions for the user
    const activeSessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: {
          in: ['waiting', 'active']
        },
        endTime: null
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        partner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Transform the sessions to match the expected format
    const transformedSessions = activeSessions.map(session => ({
      id: session.id,
      initiatorId: session.initiatorId,
      partnerId: session.partnerId || '',
      sessionType: session.sessionType as 'learning' | 'teaching' | 'collaboration',
      startTime: session.startTime.toISOString(),
      estimatedEndTime: new Date(session.startTime.getTime() + (session.durationMinutes || 60) * 60 * 1000).toISOString(),
      topics: session.topics || [],
      status: session.status as 'waiting' | 'active' | 'ended',
      tools: {
        codeEditor: true,
        whiteboard: true,
        screenShare: false,
        recording: false
      },
      initiator: session.initiator,
      partner: session.partner || {
        id: '',
        username: 'Waiting for partner...',
        avatarUrl: null
      }
    }));

    return NextResponse.json({
      success: true,
      sessions: transformedSessions
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get active sessions' },
      { status: 500 }
    );
  }
}
