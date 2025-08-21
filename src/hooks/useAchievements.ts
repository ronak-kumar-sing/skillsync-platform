import { useState, useEffect, useCallback } from 'react';
import { UserAchievement, Achievement } from '@/types';
import { achievementNotificationService } from '@/services/achievement-notification.service';

interface AchievementWithProgress extends Achievement {
  progress?: number;
  progressText?: string;
  isEarned?: boolean;
  earnedAt?: Date;
}

interface UseAchievementsReturn {
  achievements: {
    earned: UserAchievement[];
    inProgress: AchievementWithProgress[];
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkForNewAchievements: () => Promise<UserAchievement[]>;
  stats: {
    totalEarned: number;
    totalPoints: number;
    inProgressCount: number;
  };
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<{
    earned: UserAchievement[];
    inProgress: AchievementWithProgress[];
  }>({ earned: [], inProgress: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/achievements', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements({
        earned: data.earned || [],
        inProgress: data.inProgress || []
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkForNewAchievements = useCallback(async (): Promise<UserAchievement[]> => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check achievements');
      }

      const data = await response.json();
      const newAchievements = data.newAchievements || [];

      // If there are new achievements, show notifications and refetch
      if (newAchievements.length > 0) {
        achievementNotificationService.addAchievements(newAchievements);
        await fetchAchievements(); // Refetch to update the UI
      }

      return newAchievements;
    } catch (err) {
      console.error('Error checking achievements:', err);
      return [];
    }
  }, [fetchAchievements]);

  // Initial fetch
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Calculate stats
  const stats = {
    totalEarned: achievements.earned.length,
    totalPoints: achievements.earned.reduce((sum, ua) => sum + ua.achievement.points, 0),
    inProgressCount: achievements.inProgress.length
  };

  return {
    achievements,
    loading,
    error,
    refetch: fetchAchievements,
    checkForNewAchievements,
    stats
  };
}

// Hook for achievement statistics
export function useAchievementStats() {
  const [stats, setStats] = useState<{
    totalAchievements: number;
    totalPointsAwarded: number;
    mostEarnedAchievement: Achievement & { earnedCount: number };
    rareAchievements: Achievement[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/achievements/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch achievement stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching achievement stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievement stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

// Hook for leaderboard
export function useLeaderboard(filters: {
  category: 'overall' | 'weekly' | 'monthly' | 'skill_specific';
  timeframe?: 'week' | 'month' | 'all_time';
  skillId?: string;
  limit?: number;
} = { category: 'overall' }) {
  const [leaderboard, setLeaderboard] = useState<{
    entries: Array<{
      userId: string;
      username: string;
      avatarUrl?: string;
      score: number;
      rank: number;
      change: number;
    }>;
    total: number;
    userRank?: number;
  }>({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        category: filters.category,
        limit: (filters.limit || 50).toString(),
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
      setLeaderboard({
        entries: data.entries || [],
        total: data.total || 0,
        userRank: data.userRank
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refetch: fetchLeaderboard
  };
}