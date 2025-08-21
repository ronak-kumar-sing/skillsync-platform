'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassProgress } from '@/components/ui/GlassProgress';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { AchievementGallery } from './AchievementGallery';
import { Leaderboard } from './Leaderboard';
import { useAchievements, useAchievementStats, useLeaderboard } from '@/hooks/useAchievements';
import { useTestAchievements } from './AchievementNotification';

interface GamificationDashboardProps {
  className?: string;
}

export function GamificationDashboard({ className = '' }: GamificationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'leaderboard'>('overview');
  const { achievements, loading: achievementsLoading, stats: userStats } = useAchievements();
  const { stats: globalStats, loading: statsLoading } = useAchievementStats();
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard({ category: 'overall', limit: 10 });
  const { triggerTest } = useTestAchievements();

  // Calculate user's leaderboard position
  const userRank = leaderboard.leaderboard.userRank ||
    leaderboard.leaderboard.entries.findIndex(entry => entry.userId === 'current-user') + 1 || null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🥇' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* User Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-white mb-1">
              {achievementsLoading ? '...' : userStats.totalEarned}
            </div>
            <div className="text-white/70 text-sm">Achievements</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {achievementsLoading ? '...' : userStats.totalPoints.toLocaleString()}
            </div>
            <div className="text-white/70 text-sm">Total Points</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {achievementsLoading ? '...' : userStats.inProgressCount}
            </div>
            <div className="text-white/70 text-sm">In Progress</div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <GlassCard className="p-4 text-center">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {leaderboardLoading ? '...' : userRank ? `#${userRank}` : 'N/A'}
            </div>
            <div className="text-white/70 text-sm">Rank</div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Achievements Preview */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Recent Achievements</h3>
            <GlassButton
              onClick={() => setActiveTab('achievements')}
              variant="ghost"
              size="sm"
            >
              View All
            </GlassButton>
          </div>

          {achievementsLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <LoadingSkeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {achievements.earned.slice(0, 8).map((userAchievement, index) => (
                <motion.div
                  key={userAchievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="aspect-square bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-2 flex items-center justify-center shadow-lg shadow-yellow-500/30"
                >
                  {userAchievement.achievement.iconUrl ? (
                    <img
                      src={userAchievement.achievement.iconUrl}
                      alt={userAchievement.achievement.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {!achievementsLoading && achievements.earned.length === 0 && (
            <div className="text-center py-8">
              <div className="text-white/60 mb-2">No achievements yet</div>
              <div className="text-white/40 text-sm">
                Complete sessions to earn your first achievement!
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Progress Towards Next Achievements */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Next Achievements</h3>

          {achievementsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {achievements.inProgress.slice(0, 3).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    {achievement.iconUrl ? (
                      <img
                        src={achievement.iconUrl}
                        alt={achievement.name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="text-white font-medium">{achievement.name}</div>
                    <div className="text-white/60 text-sm mb-2">{achievement.description}</div>
                    <div className="flex items-center space-x-2">
                      <GlassProgress
                        value={achievement.progress || 0}
                        className="h-2 flex-1"
                      />
                      <span className="text-white/70 text-xs">
                        {achievement.progressText}
                      </span>
                    </div>
                  </div>

                  <div className="text-yellow-400 font-bold text-sm">
                    +{achievement.points}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!achievementsLoading && achievements.inProgress.length === 0 && (
            <div className="text-center py-8">
              <div className="text-white/60 mb-2">All achievements unlocked!</div>
              <div className="text-white/40 text-sm">
                You're a SkillSync master! 🎉
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Top Leaderboard Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Top Performers</h3>
            <GlassButton
              onClick={() => setActiveTab('leaderboard')}
              variant="ghost"
              size="sm"
            >
              View Full Leaderboard
            </GlassButton>
          </div>

          {leaderboardLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.leaderboard.entries.slice(0, 5).map((entry, index) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-white/5"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {entry.rank}
                  </div>
                  <div className="flex-1 text-white font-medium">
                    {entry.username}
                  </div>
                  <div className="text-yellow-400 font-bold">
                    {entry.score.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Development Testing */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <GlassCard className="p-4">
            <h4 className="text-white font-medium mb-3">Development Testing</h4>
            <div className="flex space-x-2">
              <GlassButton onClick={() => triggerTest('common')} size="sm">
                Test Common
              </GlassButton>
              <GlassButton onClick={() => triggerTest('rare')} size="sm">
                Test Rare
              </GlassButton>
              <GlassButton onClick={() => triggerTest('epic')} size="sm">
                Test Epic
              </GlassButton>
              <GlassButton onClick={() => triggerTest('legendary')} size="sm">
                Test Legendary
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md
              font-medium transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-accent-500 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'achievements' && <AchievementGallery />}
          {activeTab === 'leaderboard' && <Leaderboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}