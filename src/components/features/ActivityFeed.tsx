'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useSocket } from '@/hooks/useSocket';

interface ActivityItem {
  id: string;
  type: 'session_completed' | 'achievement_earned' | 'skill_improved' | 'user_joined' | 'match_made';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  metadata?: {
    skillName?: string;
    achievementName?: string;
    sessionDuration?: number;
    rating?: number;
    partnerName?: string;
  };
}

interface SuggestedConnection {
  id: string;
  username: string;
  avatar?: string;
  skills: string[];
  compatibilityScore: number;
  isOnline: boolean;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [suggestedConnections, setSuggestedConnections] = useState<SuggestedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, isConnected } = useSocket({ namespace: '/dashboard' });

  // Fetch initial activity data
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        // Fetch recent activities
        const activitiesResponse = await fetch('/api/dashboard/activity', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Fetch suggested connections
        const connectionsResponse = await fetch('/api/dashboard/suggestions', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!activitiesResponse.ok || !connectionsResponse.ok) {
          throw new Error('Failed to fetch activity data');
        }

        const activitiesData = await activitiesResponse.json();
        const connectionsData = await connectionsResponse.json();

        setActivities(activitiesData.activities);
        setSuggestedConnections(connectionsData.suggestions);
        setError(null);
      } catch (err) {
        console.error('Error fetching activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewActivity = (activity: ActivityItem) => {
      setActivities(prev => [activity, ...prev.slice(0, 19)]); // Keep last 20 items
    };

    const handleSuggestionsUpdate = (suggestions: SuggestedConnection[]) => {
      setSuggestedConnections(suggestions);
    };

    socket.on('activity:new', handleNewActivity);
    socket.on('suggestions:update', handleSuggestionsUpdate);

    return () => {
      socket.off('activity:new', handleNewActivity);
      socket.off('suggestions:update', handleSuggestionsUpdate);
    };
  }, [socket, isConnected]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session_completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'achievement_earned':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'skill_improved':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'user_joined':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'match_made':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'session_completed': return 'text-green-400';
      case 'achievement_earned': return 'text-yellow-400';
      case 'skill_improved': return 'text-blue-400';
      case 'user_joined': return 'text-purple-400';
      case 'match_made': return 'text-indigo-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Activity Feed</h2>
        <GlassCard className="p-4">
          <LoadingSkeleton className="h-64" />
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-4 text-center">
        <div className="text-red-400 mb-2">Failed to load activity</div>
        <div className="text-white/60 text-sm">{error}</div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Activity Feed</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/70 text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        <GlassCard className="p-4 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-white/10 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">
                        {activity.title}
                      </div>
                      <div className="text-white/70 text-xs mt-1">
                        {activity.description}
                      </div>
                      <div className="text-white/50 text-xs mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-white/60 mb-2">No recent activity</div>
                <div className="text-white/40 text-sm">
                  Start a session to see activity here!
                </div>
              </div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Suggested Connections */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Suggested Connections</h3>

        <div className="space-y-3">
          {suggestedConnections.slice(0, 3).map((connection, index) => (
            <motion.div
              key={connection.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {connection.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {connection.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
                      )}
                    </div>

                    <div>
                      <div className="text-white font-medium text-sm">
                        {connection.username}
                      </div>
                      <div className="text-white/60 text-xs">
                        {connection.skills.slice(0, 2).join(', ')}
                        {connection.skills.length > 2 && ` +${connection.skills.length - 2}`}
                      </div>
                      <div className="text-green-400 text-xs">
                        {connection.compatibilityScore}% match
                      </div>
                    </div>
                  </div>

                  <GlassButton
                    variant="primary"
                    size="sm"
                    className="text-xs px-3 py-1"
                  >
                    Connect
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {suggestedConnections.length === 0 && (
            <GlassCard className="p-4 text-center">
              <div className="text-white/60 text-sm">
                No suggestions available
              </div>
              <div className="text-white/40 text-xs mt-1">
                Complete your profile to get better matches
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}