'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassProgress } from '@/components/ui/GlassProgress';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';

interface SkillProgress {
  id: string;
  name: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  progress: number; // 0-100
  sessionsCount: number;
  lastPracticed?: Date;
}

interface LearningAnalytics {
  totalSessionsThisWeek: number;
  totalMinutesThisWeek: number;
  averageRating: number;
  skillsImproved: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalProgress: number; // 0-100
  skillProgress: SkillProgress[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  isNew?: boolean;
}

export function UserProgressTracker() {
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Fetch user progress data
  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        // Fetch learning analytics
        const analyticsResponse = await fetch('/api/dashboard/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Fetch recent achievements
        const achievementsResponse = await fetch('/api/dashboard/achievements/recent', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!analyticsResponse.ok || !achievementsResponse.ok) {
          throw new Error('Failed to fetch progress data');
        }

        const analyticsData = await analyticsResponse.json();
        const achievementsData = await achievementsResponse.json();

        setAnalytics(analyticsData.analytics);
        setRecentAchievements(achievementsData.achievements);
        setError(null);
      } catch (err) {
        console.error('Error fetching progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to load progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Your Progress</h2>
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
        <div className="text-red-400 mb-2">Failed to load progress data</div>
        <div className="text-white/60 text-sm">{error}</div>
      </GlassCard>
    );
  }

  if (!analytics) {
    return null;
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-indigo-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-400';
    if (level >= 3) return 'text-blue-400';
    if (level >= 2) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Your Progress</h2>

      {/* Learning Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {analytics.totalSessionsThisWeek}
            </div>
            <div className="text-white/70 text-sm">Sessions This Week</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {Math.round(analytics.totalMinutesThisWeek / 60)}h
            </div>
            <div className="text-white/70 text-sm">Hours Learned</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {analytics.averageRating.toFixed(1)}
            </div>
            <div className="text-white/70 text-sm">Avg Rating</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {analytics.currentStreak}
            </div>
            <div className="text-white/70 text-sm">Day Streak</div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Progress */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Skill Progress</h3>
              <div className="text-sm text-white/70">
                {analytics.skillsImproved} improved this week
              </div>
            </div>

            <div className="space-y-4">
              {analytics.skillProgress.slice(0, 5).map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{skill.name}</div>
                      <div className="text-white/60 text-sm">
                        Level {skill.currentLevel} → {skill.targetLevel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getSkillLevelColor(skill.currentLevel)}`}>
                        {skill.progress}%
                      </div>
                      <div className="text-white/60 text-xs">
                        {skill.sessionsCount} sessions
                      </div>
                    </div>
                  </div>
                  <GlassProgress value={skill.progress} className="h-2" />
                </motion.div>
              ))}
            </div>

            {/* Weekly Goal */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70">Weekly Goal</span>
                <span className="text-white font-medium">
                  {analytics.weeklyGoalProgress}%
                </span>
              </div>
              <GlassProgress value={analytics.weeklyGoalProgress} className="h-3" />
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Achievements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Achievements</h3>

            <div className="space-y-3">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getRarityColor(achievement.rarity)} flex items-center justify-center`}>
                      {achievement.iconUrl ? (
                        <img
                          src={achievement.iconUrl}
                          alt={achievement.name}
                          className="w-8 h-8"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{achievement.name}</span>
                        {achievement.isNew && (
                          <span className="bg-accent-500 text-white text-xs px-2 py-1 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-white/60 text-sm">{achievement.description}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-yellow-400 text-xs">+{achievement.points} pts</span>
                        <span className={`text-xs capitalize ${getRarityColor(achievement.rarity).replace('from-', 'text-').replace(' to-orange-500', '').replace(' to-pink-500', '').replace(' to-indigo-500', '').replace(' to-gray-600', '')}`}>
                          {achievement.rarity}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-white/60 mb-2">No recent achievements</div>
                  <div className="text-white/40 text-sm">
                    Complete sessions to earn achievements!
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}