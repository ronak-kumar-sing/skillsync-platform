'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import Link from 'next/link';

interface ActiveSession {
  id: string;
  initiatorId: string;
  partnerId: string;
  sessionType: 'learning' | 'teaching' | 'collaboration';
  startTime: string;
  estimatedEndTime: string;
  topics: string[];
  status: 'waiting' | 'active' | 'ended';
  tools: {
    codeEditor: boolean;
    whiteboard: boolean;
    screenShare: boolean;
    recording: boolean;
  };
  initiator: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  partner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface SessionMetrics {
  activeSessions: number;
  completedToday: number;
  averageSessionDuration: number;
  topSkills: Array<{ name: string; count: number }>;
}

const SessionsPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchActiveSessions();
      fetchSessionMetrics();
    }
  }, [user]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.sessions || []);
      } else {
        throw new Error('Failed to fetch active sessions');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching session metrics:', error);
    }
  };

  const joinSession = (sessionId: string) => {
    window.location.href = `/call/${sessionId}`;
  };

  const getPartnerInfo = (session: ActiveSession) => {
    return session.initiatorId === user?.id ? session.partner : session.initiator;
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'learning':
        return 'bg-blue-500/20 text-blue-300';
      case 'teaching':
        return 'bg-green-500/20 text-green-300';
      case 'collaboration':
        return 'bg-purple-500/20 text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'active':
        return 'bg-green-500/20 text-green-300';
      case 'ended':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    return `${diffMins} min`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
        <GlassCard className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please log in to access your sessions.</p>
          <Link href="/auth">
            <GlassButton>Sign In</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Active Sessions</h1>
            <p className="text-gray-300">Manage your ongoing learning sessions</p>
          </div>
          <div className="flex gap-3">
            <Link href="/match">
              <GlassButton variant="primary">Find New Match</GlassButton>
            </Link>
            <GlassButton
              variant="ghost"
              onClick={() => {
                fetchActiveSessions();
                fetchSessionMetrics();
              }}
            >
              Refresh
            </GlassButton>
          </div>
        </div>

        {/* Session Metrics */}
        {sessionMetrics && (
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4">Today's Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{sessionMetrics.activeSessions}</div>
                <div className="text-sm text-gray-300">Active Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{sessionMetrics.completedToday}</div>
                <div className="text-sm text-gray-300">Completed Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{sessionMetrics.averageSessionDuration}min</div>
                <div className="text-sm text-gray-300">Avg Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{sessionMetrics.topSkills.length}</div>
                <div className="text-sm text-gray-300">Skills Practiced</div>
              </div>
            </div>

            {sessionMetrics.topSkills.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Top Skills Today</h4>
                <div className="flex flex-wrap gap-2">
                  {sessionMetrics.topSkills.slice(0, 5).map((skill) => (
                    <GlassBadge key={skill.name} variant="secondary" className="text-xs">
                      {skill.name} ({skill.count})
                    </GlassBadge>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Active Sessions List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Your Active Sessions</h2>
            <span className="text-sm text-gray-400">
              {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading && activeSessions.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-32" />
              ))}
            </div>
          ) : error ? (
            <GlassCard className="text-center">
              <div className="text-red-400 mb-4">⚠️ {error}</div>
              <GlassButton
                variant="ghost"
                onClick={fetchActiveSessions}
              >
                Retry
              </GlassButton>
            </GlassCard>
          ) : activeSessions.length === 0 ? (
            <GlassCard className="text-center py-12">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Active Sessions</h3>
              <p className="text-gray-300 mb-6">You don't have any active sessions right now.</p>
              <Link href="/match">
                <GlassButton>Find a Learning Partner</GlassButton>
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const partner = getPartnerInfo(session);

                return (
                  <GlassCard key={session.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Session Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Partner Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {partner.avatarUrl ? (
                              <img
                                src={partner.avatarUrl}
                                alt={partner.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              partner.username.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* Session Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{partner.username}</h3>
                              <GlassBadge
                                variant="primary"
                                className={`text-xs ${getSessionTypeColor(session.sessionType)}`}
                              >
                                {session.sessionType}
                              </GlassBadge>
                              <GlassBadge
                                variant="secondary"
                                className={`text-xs ${getStatusColor(session.status)}`}
                              >
                                {session.status}
                              </GlassBadge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-300">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Started: {formatTime(session.startTime)}
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Duration: {calculateDuration(session.startTime, session.estimatedEndTime)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Topics */}
                        {session.topics.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-400 mb-1">Topics:</div>
                            <div className="flex flex-wrap gap-1">
                              {session.topics.map((topic, index) => (
                                <GlassBadge key={index} variant="default" className="text-xs">
                                  {topic}
                                </GlassBadge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tools */}
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Available Tools:</div>
                          <div className="flex gap-2">
                            {session.tools.codeEditor && (
                              <GlassBadge variant="default" className="text-xs">
                                💻 Code Editor
                              </GlassBadge>
                            )}
                            {session.tools.whiteboard && (
                              <GlassBadge variant="default" className="text-xs">
                                🎨 Whiteboard
                              </GlassBadge>
                            )}
                            {session.tools.screenShare && (
                              <GlassBadge variant="default" className="text-xs">
                                📺 Screen Share
                              </GlassBadge>
                            )}
                            {session.tools.recording && (
                              <GlassBadge variant="default" className="text-xs">
                                🎥 Recording
                              </GlassBadge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 lg:flex-col lg:w-32">
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={() => joinSession(session.id)}
                          className="flex-1 lg:flex-none"
                        >
                          {session.status === 'waiting' ? 'Join' : 'Rejoin'}
                        </GlassButton>

                        <GlassButton
                          variant="ghost"
                          size="sm"
                          className="flex-1 lg:flex-none"
                        >
                          Details
                        </GlassButton>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/match">
              <GlassButton variant="primary" className="w-full justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find New Partner
              </GlassButton>
            </Link>

            <Link href="/profile">
              <GlassButton variant="ghost" className="w-full justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Update Skills
              </GlassButton>
            </Link>

            <Link href="/analytics">
              <GlassButton variant="ghost" className="w-full justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analytics
              </GlassButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SessionsPage;
