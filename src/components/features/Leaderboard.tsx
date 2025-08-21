'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  change: number;
}

interface LeaderboardFilters {
  category: 'overall' | 'weekly' | 'monthly' | 'skill_specific';
  skillId?: string;
  timeframe?: 'week' | 'month' | 'all_time';
}

interface LeaderboardProps {
  className?: string;
  showFilters?: boolean;
  maxEntries?: number;
}

export function Leaderboard({
  className = '',
  showFilters = true,
  maxEntries = 50
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    category: 'overall',
    timeframe: 'all_time'
  });
  const [userRank, setUserRank] = useState<number | null>(null);
  const [skills, setSkills] = useState<Array<{ id: string; name: string }>>([]);

  const { user } = useAuth();

  // Fetch leaderboard data
  useEffect(() => {
    fetchLeaderboard();
  }, [filters]);

  // Fetch skills for filtering
  useEffect(() => {
    if (showFilters) {
      fetchSkills();
    }
  }, [showFilters]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const queryParams = new URLSearchParams({
        category: filters.category,
        limit: maxEntries.toString(),
        ...(filters.timeframe && { timeframe: filters.timeframe }),
        ...(filters.skillId && { skillId: filters.skillId })
      });

      const response = await fetch(`/api/leaderboard?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setEntries(data.entries);
      setUserRank(data.userRank);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/skills', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">2</span>
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">3</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <span className="text-white/70 font-medium text-sm">{rank}</span>
          </div>
        );
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          <span className="text-xs ml-1">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
          <span className="text-xs ml-1">{Math.abs(change)}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </div>
    );
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'overall': return 'Overall Points';
      case 'weekly': return 'Weekly Activity';
      case 'monthly': return 'Monthly Progress';
      case 'skill_specific': return 'Skill Mastery';
      default: return 'Score';
    }
  };

  if (loading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
          {showFilters && <LoadingSkeleton className="w-32 h-10" />}
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-16" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className={`p-6 text-center ${className}`}>
        <div className="text-red-400 mb-2">Failed to load leaderboard</div>
        <div className="text-white/60 text-sm mb-4">{error}</div>
        <GlassButton onClick={fetchLeaderboard} size="sm">
          Try Again
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>

        {showFilters && (
          <div className="flex items-center space-x-3">
            <GlassSelect
              value={filters.category}
              onChange={(value) => setFilters(prev => ({ ...prev, category: value as any }))}
              options={[
                { value: 'overall', label: 'Overall' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'skill_specific', label: 'By Skill' }
              ]}
              className="w-32"
            />

            {filters.category !== 'overall' && (
              <GlassSelect
                value={filters.timeframe || 'all_time'}
                onChange={(value) => setFilters(prev => ({ ...prev, timeframe: value as any }))}
                options={[
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'all_time', label: 'All Time' }
                ]}
                className="w-32"
              />
            )}

            {filters.category === 'skill_specific' && (
              <GlassSelect
                value={filters.skillId || ''}
                onChange={(value) => setFilters(prev => ({ ...prev, skillId: value || undefined }))}
                options={[
                  { value: '', label: 'All Skills' },
                  ...skills.map(skill => ({ value: skill.id, label: skill.name }))
                ]}
                className="w-40"
              />
            )}
          </div>
        )}
      </div>

      {/* User's rank (if not in top entries) */}
      {userRank && userRank > maxEntries && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-accent-500/20 rounded-lg border border-accent-500/30"
        >
          <div className="text-center text-white/80 text-sm">
            Your rank: <span className="font-bold text-accent-400">#{userRank}</span>
          </div>
        </motion.div>
      )}

      {/* Leaderboard entries */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`
                flex items-center space-x-4 p-4 rounded-lg transition-colors
                ${entry.userId === user?.id
                  ? 'bg-accent-500/20 border border-accent-500/30'
                  : 'bg-white/5 hover:bg-white/10'
                }
              `}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {entry.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="flex-1">
                <div className="text-white font-medium">
                  {entry.username}
                  {entry.userId === user?.id && (
                    <span className="ml-2 text-accent-400 text-sm">(You)</span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-white font-bold">
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-white/60 text-xs">
                  {getCategoryLabel(filters.category)}
                </div>
              </div>

              {/* Change indicator */}
              <div className="flex-shrink-0 w-12 flex justify-center">
                {getChangeIcon(entry.change)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/60 mb-2">No leaderboard data available</div>
            <div className="text-white/40 text-sm">
              Complete sessions to appear on the leaderboard!
            </div>
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="mt-6 text-center">
        <GlassButton
          onClick={fetchLeaderboard}
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </GlassButton>
      </div>
    </GlassCard>
  );
}