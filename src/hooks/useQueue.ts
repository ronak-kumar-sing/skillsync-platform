import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

// Queue-related types
interface QueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number;
  averageMatchTime: number;
}

interface QueueStats {
  totalInQueue: number;
  bySessionType: Record<string, number>;
  byUrgency: Record<string, number>;
  averageWaitTime: number;
  matchesPerHour: number;
}

interface MatchingRequest {
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
}

interface MatchFound {
  partnerId: string;
  sessionId: string;
  compatibilityScore: number;
}

interface UseQueueReturn {
  // State
  isInQueue: boolean;
  queueStatus: QueueStatus | null;
  queueStats: QueueStats | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  joinQueue: (request: MatchingRequest) => Promise<void>;
  leaveQueue: () => Promise<void>;
  refreshStatus: () => Promise<void>;

  // Events
  onMatchFound: (callback: (match: MatchFound) => void) => void;
  onQueueUpdate: (callback: (status: QueueStatus) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useQueue(): UseQueueReturn {
  const { user, token } = useAuth();
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<{
    onMatchFound?: (match: MatchFound) => void;
    onQueueUpdate?: (status: QueueStatus) => void;
    onError?: (error: string) => void;
  }>({});

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) return;

    const socket = io('/queue', {
      auth: { token },
      autoConnect: false,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);

      // Authenticate with the server
      socket.emit('authenticate', { token });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    // Authentication events
    socket.on('authenticated', () => {
      console.log('Queue socket authenticated');
      // Request initial queue status
      socket.emit('get_queue_status');
      socket.emit('get_queue_stats');
    });

    socket.on('auth_error', (data) => {
      setError(`Authentication error: ${data.message}`);
      setIsConnected(false);
    });

    // Queue events
    socket.on('queue_joined', (data) => {
      setIsInQueue(true);
      setQueueStatus(data.queueStatus);
      setError(null);
      callbacksRef.current.onQueueUpdate?.(data.queueStatus);
    });

    socket.on('queue_left', () => {
      setIsInQueue(false);
      setQueueStatus(null);
      setError(null);
    });

    socket.on('queue_status', (status) => {
      if (status) {
        setIsInQueue(true);
        setQueueStatus(status);
        callbacksRef.current.onQueueUpdate?.(status);
      } else {
        setIsInQueue(false);
        setQueueStatus(null);
      }
    });

    socket.on('queue_position_update', (status) => {
      setQueueStatus(status);
      callbacksRef.current.onQueueUpdate?.(status);
    });

    socket.on('queue_stats_update', (stats) => {
      setQueueStats(stats);
    });

    socket.on('queue_stats', (stats) => {
      setQueueStats(stats);
    });

    socket.on('match_found', (match) => {
      setIsInQueue(false);
      setQueueStatus(null);
      callbacksRef.current.onMatchFound?.(match);
    });

    socket.on('queue_error', (data) => {
      setError(data.message);
      callbacksRef.current.onError?.(data.message);
    });

    socket.on('error', (data) => {
      setError(data.message);
      callbacksRef.current.onError?.(data.message);
    });

    // Connect the socket
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  // Join queue
  const joinQueue = useCallback(async (request: MatchingRequest) => {
    if (!socketRef.current?.connected) {
      throw new Error('Not connected to queue service');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use socket for real-time updates
      socketRef.current.emit('join_queue', request);

      // Also make HTTP request as fallback
      const response = await fetch('/api/matching/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join queue');
      }

      const data = await response.json();
      setIsInQueue(true);
      setQueueStatus(data.queueStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join queue';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Leave queue
  const leaveQueue = useCallback(async () => {
    if (!socketRef.current?.connected) {
      throw new Error('Not connected to queue service');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use socket for real-time updates
      socketRef.current.emit('leave_queue');

      // Also make HTTP request as fallback
      const response = await fetch('/api/matching/queue', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave queue');
      }

      setIsInQueue(false);
      setQueueStatus(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave queue';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/matching/queue', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get queue status');
      }

      const data = await response.json();
      setIsInQueue(data.inQueue);
      setQueueStatus(data.queueStatus);

      // Also refresh stats
      const statsResponse = await fetch('/api/matching/queue/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setQueueStats(statsData.stats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh status';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Event callback setters
  const onMatchFound = useCallback((callback: (match: MatchFound) => void) => {
    callbacksRef.current.onMatchFound = callback;
  }, []);

  const onQueueUpdate = useCallback((callback: (status: QueueStatus) => void) => {
    callbacksRef.current.onQueueUpdate = callback;
  }, []);

  const onError = useCallback((callback: (error: string) => void) => {
    callbacksRef.current.onError = callback;
  }, []);

  return {
    // State
    isInQueue,
    queueStatus,
    queueStats,
    isConnected,
    isLoading,
    error,

    // Actions
    joinQueue,
    leaveQueue,
    refreshStatus,

    // Events
    onMatchFound,
    onQueueUpdate,
    onError,
  };
}