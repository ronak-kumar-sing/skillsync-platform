'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassProgress } from '@/components/ui/GlassProgress';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { Achievement, UserAchievement } from '@/types';

interface AchievementWithProgress extends Achievement {
  progress?: number;
  progressText?: string;
  isEarned?: boolean;
  earnedAt?: Date;
}

interface AchievementGalleryProps {
  className?: string;
  showProgress?: boolean;
  maxDisplay?: number;
}

export function AchievementGallery({
  className = '',
  showProgress = true,
  maxDisplay
}: AchievementGalleryProps) {
  const [achievements, setAchievements] = useState<{
    earned: UserAchievement[];
    inProgress: AchievementWithProgress[];
  }>({ earned: [], inProgress: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'in_progress'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/achievements', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements(data);

      // Extract unique categories
      const allAchievements = [...data.earned.map((ua: UserAchievement) => ua.achievement), ...data.inProgress];
      const uniqueCategories = [...new Set(allAchievements.map((a: Achievement) => a.category))];
      setCategories(uniqueCategories);

      setError(null);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-indigo-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-lg shadow-yellow-500/30';
      case 'epic': return 'shadow-lg shadow-purple-500/30';
      case 'rare': return 'shadow-lg shadow-blue-500/30';
      default: return 'shadow-lg shadow-gray-500/20';
    }
  };

  const getFilteredAchievements = () => {
    let filtered: AchievementWithProgress[] = [];

    if (filter === 'all' || filter === 'earned') {
      const earnedWithProgress = achievements.earned.map(ua => ({
        ...ua.achievement,
        isEarned: true,
        earnedAt: ua.earnedAt,
        progress: 100,
        progressText: 'Completed'
      }));
      filtered.push(...earnedWithProgress);
    }

    if (filter === 'all' || filter === 'in_progress') {
      const inProgressWithFlag = achievements.inProgress.map(a => ({
        ...a,
        isEarned: false
      }));
      filtered.push(...inProgressWithFlag);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    // Apply max display limit
    if (maxDisplay) {
      filtered = filtered.slice(0, maxDisplay);
    }

    return filtered;
  };

  const filteredAchievements = getFilteredAchievements();

  if (loading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Achievements</h2>
          <LoadingSkeleton className="w-32 h-10" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <LoadingSkeleton key={i} className="aspect-square" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className={`p-6 text-center ${className}`}>
        <div className="text-red-400 mb-2">Failed to load achievements</div>
        <div className="text-white/60 text-sm mb-4">{error}</div>
        <GlassButton onClick={fetchAchievements} size="sm">
          Try Again
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Achievements</h2>

          <div className="flex items-center space-x-3">
            {/* Filter buttons */}
            <div className="flex bg-white/10 rounded-lg p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'earned', label: 'Earned' },
                { key: 'in_progress', label: 'In Progress' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`
                    px-3 py-1 rounded text-sm font-medium transition-colors
                    ${filter === key
                      ? 'bg-accent-500 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{achievements.earned.length}</div>
            <div className="text-white/60 text-sm">Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-400">
              {achievements.earned.reduce((sum, ua) => sum + ua.achievement.points, 0)}
            </div>
            <div className="text-white/60 text-sm">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{achievements.inProgress.length}</div>
            <div className="text-white/60 text-sm">In Progress</div>
          </div>
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAchievement(achievement)}
                className={`
                  relative aspect-square cursor-pointer group
                  bg-gradient-to-br ${getRarityColor(achievement.rarity)}
                  ${getRarityGlow(achievement.rarity)}
                  rounded-xl p-4 flex flex-col items-center justify-center
                  transition-all duration-300
                  ${!achievement.isEarned ? 'opacity-60 grayscale' : ''}
                `}
              >
                {/* Achievement icon */}
                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                  {achievement.iconUrl ? (
                    <img
                      src={achievement.iconUrl}
                      alt={achievement.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                </div>

                {/* Achievement name */}
                <div className="text-white text-xs font-medium text-center line-clamp-2">
                  {achievement.name}
                </div>

                {/* Points */}
                <div className="text-yellow-300 text-xs font-bold mt-1">
                  +{achievement.points}
                </div>

                {/* Progress bar for in-progress achievements */}
                {!achievement.isEarned && showProgress && achievement.progress !== undefined && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <GlassProgress
                      value={achievement.progress}
                      className="h-1"
                    />
                  </div>
                )}

                {/* Rarity indicator */}
                <div className="absolute top-2 right-2">
                  <div className={`
                    w-3 h-3 rounded-full
                    ${achievement.rarity === 'legendary' ? 'bg-yellow-400' :
                      achievement.rarity === 'epic' ? 'bg-purple-400' :
                        achievement.rarity === 'rare' ? 'bg-blue-400' : 'bg-gray-400'
                    }
                  `} />
                </div>

                {/* Earned indicator */}
                {achievement.isEarned && (
                  <div className="absolute top-2 left-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/60 mb-2">No achievements found</div>
            <div className="text-white/40 text-sm">
              {filter === 'earned'
                ? 'Complete sessions to earn your first achievement!'
                : 'Try adjusting your filters'
              }
            </div>
          </div>
        )}
      </GlassCard>

      {/* Achievement detail modal */}
      <GlassModal
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        title="Achievement Details"
      >
        {selectedAchievement && (
          <div className="text-center">
            {/* Achievement icon */}
            <div className={`
              w-24 h-24 mx-auto mb-4 rounded-xl
              bg-gradient-to-br ${getRarityColor(selectedAchievement.rarity)}
              ${getRarityGlow(selectedAchievement.rarity)}
              flex items-center justify-center
              ${!selectedAchievement.isEarned ? 'opacity-60 grayscale' : ''}
            `}>
              {selectedAchievement.iconUrl ? (
                <img
                  src={selectedAchievement.iconUrl}
                  alt={selectedAchievement.name}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              )}
            </div>

            {/* Achievement info */}
            <h3 className="text-2xl font-bold text-white mb-2">
              {selectedAchievement.name}
            </h3>

            <p className="text-white/80 mb-4">
              {selectedAchievement.description}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-6 mb-4">
              <div className="text-center">
                <div className="text-yellow-400 font-bold">+{selectedAchievement.points}</div>
                <div className="text-white/60 text-sm">Points</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold capitalize">{selectedAchievement.rarity}</div>
                <div className="text-white/60 text-sm">Rarity</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold capitalize">{selectedAchievement.category}</div>
                <div className="text-white/60 text-sm">Category</div>
              </div>
            </div>

            {/* Progress or earned date */}
            {selectedAchievement.isEarned ? (
              <div className="text-green-400 text-sm">
                ✓ Earned {selectedAchievement.earnedAt ? new Date(selectedAchievement.earnedAt).toLocaleDateString() : ''}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-white/70 text-sm">
                  Progress: {selectedAchievement.progressText}
                </div>
                {selectedAchievement.progress !== undefined && (
                  <GlassProgress
                    value={selectedAchievement.progress}
                    className="h-2"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </GlassModal>
    </>
  );
}