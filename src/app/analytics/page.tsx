'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import Link from 'next/link';

interface LearningAnalytics {
  totalSessions: number;
  totalMinutesLearned: number;
  averageRating: number;
  skillsLearned: number;
  skillsTaught: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: Array<{
    week: string;
    sessions: number;
    minutes: number;
    rating: number;
  }>;
  skillBreakdown: Array<{
    skill: string;
    sessionsCount: number;
    averageRating: number;
    hoursSpent: number;
    lastPracticed: string;
  }>;
  monthlyGoals: {
    sessions: { target: number; current: number };
    skills: { target: number; current: number };
    minutes: { target: number; current: number };
  };
}

interface MatchingMetrics {
  totalMatches: number;
  successfulMatches: number;
  averageMatchTime: number;
  averageCompatibilityScore: number;
  matchSuccessRate: number;
  topSkillCategories: Array<{ category: string; count: number }>;
  averageSessionRating: number;
  userRetentionRate: number;
}

const AnalyticsPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [matchingMetrics, setMatchingMetrics] = useState<MatchingMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      fetchMatchingMetrics();
    }
  }, [user, timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/analytics?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingMetrics = async () => {
    try {
      const response = await fetch('/api/matching/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMatchingMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching matching metrics:', error);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
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
          <p className="text-gray-300 mb-6">Please log in to access your analytics.</p>
          <Link href="/auth">
            <GlassButton>Sign In</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Learning Analytics</h1>
            <p className="text-gray-300">Track your progress and insights</p>
          </div>

          <div className="flex gap-2">
            {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
              <GlassButton
                key={period}
                variant={timeframe === period ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="capitalize"
              >
                {period}
              </GlassButton>
            ))}
          </div>
        </div>

        {loading && !analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
        ) : error ? (
          <GlassCard className="text-center">
            <div className="text-red-400 mb-4">⚠️ {error}</div>
            <GlassButton variant="ghost" onClick={fetchAnalytics}>
              Retry
            </GlassButton>
          </GlassCard>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{analytics.totalSessions}</div>
                <div className="text-sm text-gray-300">Total Sessions</div>
              </GlassCard>

              <GlassCard className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {Math.round(analytics.totalMinutesLearned / 60)}h
                </div>
                <div className="text-sm text-gray-300">Hours Learned</div>
              </GlassCard>

              <GlassCard className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {analytics.averageRating.toFixed(1)}⭐
                </div>
                <div className="text-sm text-gray-300">Average Rating</div>
              </GlassCard>

              <GlassCard className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">{analytics.currentStreak}</div>
                <div className="text-sm text-gray-300">Current Streak</div>
              </GlassCard>
            </div>

            {/* Monthly Goals */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Goals</h3>
              <div className="space-y-4">
                {/* Sessions Goal */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Sessions Goal</span>
                    <span className="text-sm text-white">
                      {analytics.monthlyGoals.sessions.current} / {analytics.monthlyGoals.sessions.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(
                          analytics.monthlyGoals.sessions.current,
                          analytics.monthlyGoals.sessions.target
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {/* Skills Goal */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">New Skills Goal</span>
                    <span className="text-sm text-white">
                      {analytics.monthlyGoals.skills.current} / {analytics.monthlyGoals.skills.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(
                          analytics.monthlyGoals.skills.current,
                          analytics.monthlyGoals.skills.target
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {/* Minutes Goal */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Learning Minutes Goal</span>
                    <span className="text-sm text-white">
                      {analytics.monthlyGoals.minutes.current} / {analytics.monthlyGoals.minutes.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(
                          analytics.monthlyGoals.minutes.current,
                          analytics.monthlyGoals.minutes.target
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Skills Breakdown */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Skills Progress</h3>
              {analytics.skillBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {analytics.skillBreakdown.slice(0, 8).map((skill) => (
                    <div key={skill.skill} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-white">{skill.skill}</span>
                          <GlassBadge variant="default" className="text-xs">
                            {skill.sessionsCount} sessions
                          </GlassBadge>
                          <GlassBadge variant="success" className="text-xs">
                            {skill.averageRating.toFixed(1)}⭐
                          </GlassBadge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>{skill.hoursSpent.toFixed(1)}h practiced</span>
                          <span>Last: {new Date(skill.lastPracticed).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">No skill data available yet</div>
                  <Link href="/match">
                    <GlassButton size="sm">Start Learning</GlassButton>
                  </Link>
                </div>
              )}
            </GlassCard>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Learning Stats */}
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4">Learning Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Skills Learned</span>
                    <span className="text-white font-semibold">{analytics.skillsLearned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Skills Taught</span>
                    <span className="text-white font-semibold">{analytics.skillsTaught}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Longest Streak</span>
                    <span className="text-white font-semibold">{analytics.longestStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg Session Rating</span>
                    <span className="text-white font-semibold">{analytics.averageRating.toFixed(1)}⭐</span>
                  </div>
                </div>
              </GlassCard>

              {/* Matching Performance */}
              {matchingMetrics && (
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Matching Performance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Matches</span>
                      <span className="text-white font-semibold">{matchingMetrics.totalMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Success Rate</span>
                      <span className="text-white font-semibold">
                        {(matchingMetrics.matchSuccessRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Avg Match Time</span>
                      <span className="text-white font-semibold">
                        {matchingMetrics.averageMatchTime.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Compatibility Score</span>
                      <span className="text-white font-semibold">
                        {(matchingMetrics.averageCompatibilityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Weekly Progress Chart */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Progress</h3>
              {analytics.weeklyProgress.length > 0 ? (
                <div className="space-y-3">
                  {analytics.weeklyProgress.slice(0, 8).map((week, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-gray-300">{week.week}</div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Sessions: {week.sessions}</span>
                            <span className="text-xs text-gray-400">{week.minutes}min</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, (week.sessions / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-yellow-400">
                          {week.rating.toFixed(1)}⭐
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No progress data available yet
                </div>
              )}
            </GlassCard>

            {/* Top Skills */}
            {matchingMetrics && matchingMetrics.topSkillCategories.length > 0 && (
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4">Popular Skills</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {matchingMetrics.topSkillCategories.map((skill) => (
                    <div key={skill.category} className="text-center">
                      <div className="text-lg font-bold text-blue-400 mb-1">{skill.count}</div>
                      <div className="text-xs text-gray-300">{skill.category}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Quick Actions */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link href="/match">
                  <GlassButton variant="primary" className="w-full justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find Match
                  </GlassButton>
                </Link>

                <Link href="/sessions">
                  <GlassButton variant="ghost" className="w-full justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Active Sessions
                  </GlassButton>
                </Link>

                <Link href="/profile">
                  <GlassButton variant="ghost" className="w-full justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Update Profile
                  </GlassButton>
                </Link>

                <GlassButton
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={() => {
                    fetchAnalytics();
                    fetchMatchingMetrics();
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </GlassButton>
              </div>
            </GlassCard>
          </>
        ) : (
          <GlassCard className="text-center py-12">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
            <p className="text-gray-300 mb-6">Start learning to see your analytics!</p>
            <Link href="/match">
              <GlassButton>Find Learning Partner</GlassButton>
            </Link>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
