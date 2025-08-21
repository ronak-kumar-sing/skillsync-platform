'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useSocket } from '@/hooks/useSocket';

interface QueueMetrics {
  totalInQueue: number;
  bySessionType: {
    learning: number;
    teaching: number;
    collaboration: number;
  };
  averageWaitTime: number;
  matchesPerHour: number;
  queueHealth: string | null;
}

interface SessionMetrics {
  activeSessions: number;
  completedToday: number;
  averageSessionDuration: number;
  topSkills: Array<{ name: string; count: number }>;
}

export function RealTimeMetrics() {
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, isConnected } = useSocket({ namespace: '/dashboard' });

  // Fetch initial metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        // Fetch queue metrics
        const queueResponse = await fetch('/api/matching/queue/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Fetch session metrics
        const sessionResponse = await fetch('/api/dashboard/sessions', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!queueResponse.ok || !sessionResponse.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const queueData = await queueResponse.json();
        const sessionData = await sessionResponse.json();

        setQueueMetrics(queueData.stats);
        setSessionMetrics(sessionData.metrics);
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleQueueUpdate = (metrics: QueueMetrics) => {
      setQueueMetrics(metrics);
    };

    const handleSessionUpdate = (metrics: SessionMetrics) => {
      setSessionMetrics(metrics);
    };

    socket.on('queue:metrics', handleQueueUpdate);
    socket.on('session:metrics', handleSessionUpdate);

    return () => {
      socket.off('queue:metrics', handleQueueUpdate);
      socket.off('session:metrics', handleSessionUpdate);
    };
  }, [socket, isConnected]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Real-time Metrics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <LoadingSkeleton className="h-64" />
          </GlassCard>
          <GlassCard className="p-6">
            <LoadingSkeleton className="h-64" />
          </GlassCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6 text-center">
        <div className="text-red-400 mb-2">Failed to load metrics</div>
        <div className="text-white/60 text-sm">{error}</div>
      </GlassCard>
    );
  }

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getHealthColor = (health: string | null) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Real-time Metrics</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white/70 text-sm">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Metrics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Matching Queue</h3>
              {queueMetrics?.queueHealth && (
                <span className={`text-sm font-medium ${getHealthColor(queueMetrics.queueHealth)}`}>
                  {queueMetrics.queueHealth.toUpperCase()}
                </span>
              )}
            </div>

            {queueMetrics && (
              <div className="space-y-4">
                {/* Total in Queue */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Total in Queue</span>
                  <span className="text-2xl font-bold text-white">
                    {queueMetrics.totalInQueue}
                  </span>
                </div>

                {/* Session Types */}
                <div className="space-y-2">
                  <div className="text-white/70 text-sm mb-2">By Session Type</div>
                  {Object.entries(queueMetrics.bySessionType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-white/60 capitalize">{type}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {formatWaitTime(queueMetrics.averageWaitTime)}
                    </div>
                    <div className="text-white/60 text-xs">Avg Wait Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {queueMetrics.matchesPerHour}
                    </div>
                    <div className="text-white/60 text-xs">Matches/Hour</div>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Session Metrics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Sessions</h3>

            {sessionMetrics && (
              <div className="space-y-4">
                {/* Active Sessions */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Currently Active</span>
                  <span className="text-2xl font-bold text-green-400">
                    {sessionMetrics.activeSessions}
                  </span>
                </div>

                {/* Completed Today */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Completed Today</span>
                  <span className="text-xl font-bold text-white">
                    {sessionMetrics.completedToday}
                  </span>
                </div>

                {/* Average Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Avg Duration</span>
                  <span className="text-white font-medium">
                    {Math.round(sessionMetrics.averageSessionDuration)}m
                  </span>
                </div>

                {/* Top Skills */}
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="text-white/70 text-sm mb-2">Top Skills Today</div>
                  {sessionMetrics.topSkills.slice(0, 3).map((skill, index) => (
                    <div key={skill.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white/40">#{index + 1}</span>
                        <span className="text-white/80 text-sm">{skill.name}</span>
                      </div>
                      <span className="text-white/60 text-sm">{skill.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}