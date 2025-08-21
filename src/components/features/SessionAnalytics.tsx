'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { LearningAnalytics, PerformanceTrend } from '@/services/session-analytics.service';

interface SessionAnalyticsProps {
  userId: string;
  className?: string;
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  userId,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'skills' | 'insights'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [userId, timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/sessions/analytics?timeframe=${timeframe}&insights=true&progression=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const timeframeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
    { value: 'all', label: 'All time' }
  ];

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-64" />
        <LoadingSkeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <GlassButton onClick={fetchAnalytics}>
            Try Again
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  if (!analytics) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <p className="text-center text-gray-400">No analytics data available</p>
      </GlassCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with timeframe selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Learning Analytics</h2>
        <div className="flex gap-2">
          {timeframeOptions.map((option) => (
            <GlassButton
              key={option.value}
              variant={timeframe === option.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe(option.value)}
            >
              {option.label}
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'trends', label: 'Trends' },
          { key: 'skills', label: 'Skills' },
          { key: 'insights', label: 'Insights' }
        ].map((tab) => (
          <GlassButton
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </GlassButton>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <OverviewCard
            title="Total Sessions"
            value={analytics.overview.totalSessions}
            subtitle="sessions completed"
            icon="📚"
          />
          <OverviewCard
            title="Learning Hours"
            value={analytics.overview.totalHours}
            subtitle="hours learned"
            icon="⏱️"
          />
          <OverviewCard
            title="Average Rating"
            value={analytics.overview.averageRating}
            subtitle="out of 5.0"
            icon="⭐"
          />
          <OverviewCard
            title="Current Streak"
            value={analytics.overview.currentStreak}
            subtitle="days in a row"
            icon="🔥"
          />
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <PerformanceTrendsChart trends={analytics.performanceTrends} />
          <SessionDistributionCharts distribution={analytics.sessionDistribution} />
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <SkillProgressionView progression={analytics.skillProgression} />
          <LearningVelocityView velocity={analytics.learningVelocity} />
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && analytics.insights && (
        <div className="space-y-6">
          <PersonalizedInsightsView insights={analytics.insights} />
        </div>
      )}
    </div>
  );
};

// Overview Card Component
const OverviewCard: React.FC<{
  title: string;
  value: number;
  subtitle: string;
  icon: string;
}> = ({ title, value, subtitle, icon }) => (
  <GlassCard className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="space-y-1">
      <p className="text-3xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  </GlassCard>
);

// Performance Trends Chart Component
const PerformanceTrendsChart: React.FC<{
  trends: PerformanceTrend[];
}> = ({ trends }) => (
  <GlassCard className="p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Performance Trends</h3>
    <div className="space-y-4">
      {trends.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No trend data available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.slice(-3).map((trend, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                {trend.date.toLocaleDateString()}
              </p>
              <p className="text-lg font-semibold text-white">
                {trend.sessionCount} sessions
              </p>
              <p className="text-sm text-gray-400">
                {trend.hoursLearned}h • ⭐ {trend.averageRating}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </GlassCard>
);

// Session Distribution Charts Component
const SessionDistributionCharts: React.FC<{
  distribution: any;
}> = ({ distribution }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Session Types</h3>
      <div className="space-y-3">
        {distribution.byType.map((item: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-300 capitalize">{item.type}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-white text-sm">{item.count}</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>

    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Best Learning Days</h3>
      <div className="space-y-3">
        {distribution.byDayOfWeek
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 5)
          .map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-300">{item.day}</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">{item.count} sessions</span>
                <span className="text-yellow-400 text-sm">⭐ {item.averageRating}</span>
              </div>
            </div>
          ))}
      </div>
    </GlassCard>
  </div>
);

// Skill Progression View Component
const SkillProgressionView: React.FC<{
  progression: any[];
}> = ({ progression }) => (
  <GlassCard className="p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Skill Progression</h3>
    {progression.length === 0 ? (
      <p className="text-gray-400 text-center py-8">
        Skill progression tracking will be available after more sessions
      </p>
    ) : (
      <div className="space-y-4">
        {progression.map((skill, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{skill.skillName}</h4>
              <span className="text-sm text-gray-400">{skill.category}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${skill.progressPercentage}%` }}
                  />
                </div>
              </div>
              <span className="text-white text-sm">
                Level {skill.currentLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </GlassCard>
);

// Learning Velocity View Component
const LearningVelocityView: React.FC<{
  velocity: any;
}> = ({ velocity }) => (
  <GlassCard className="p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Learning Velocity</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{velocity.sessionsPerWeek}</p>
        <p className="text-sm text-gray-400">sessions/week</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{velocity.hoursPerWeek}</p>
        <p className="text-sm text-gray-400">hours/week</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{velocity.averageSessionDuration}</p>
        <p className="text-sm text-gray-400">avg minutes</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{velocity.learningConsistency}%</p>
        <p className="text-sm text-gray-400">consistency</p>
      </div>
    </div>
    {velocity.peakLearningDays.length > 0 && (
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-sm text-gray-300 mb-2">Peak learning days:</p>
        <div className="flex gap-2">
          {velocity.peakLearningDays.map((day: string, index: number) => (
            <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">
              {day}
            </span>
          ))}
        </div>
      </div>
    )}
  </GlassCard>
);

// Personalized Insights View Component
const PersonalizedInsightsView: React.FC<{
  insights: any;
}> = ({ insights }) => (
  <div className="space-y-6">
    {/* Performance Insights */}
    {insights.performance.length > 0 && (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
        <div className="space-y-4">
          {insights.performance.map((insight: any, index: number) => (
            <div key={index} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {insight.type === 'improvement' && '📈'}
                  {insight.type === 'decline' && '📉'}
                  {insight.type === 'milestone' && '🎯'}
                  {insight.type === 'streak' && '🔥'}
                </span>
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                  <p className="text-gray-300 text-sm">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )}

    {/* Recommendations */}
    {insights.recommendations.length > 0 && (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
        <div className="space-y-4">
          {insights.recommendations.map((rec: any, index: number) => (
            <div key={index} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{rec.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                      }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                  {rec.estimatedImpact && (
                    <p className="text-blue-300 text-xs">
                      Estimated impact: {rec.estimatedImpact}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )}
  </div>
);

export default SessionAnalytics;