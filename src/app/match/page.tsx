'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import Link from 'next/link';

interface MatchingRequest {
  userId: string;
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
}

interface QueueStats {
  totalInQueue: number;
  averageWaitTime: number;
  successRate: number;
  peakHours: Array<{ hour: number; count: number }>;
}

const MatchPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [matchingRequest, setMatchingRequest] = useState<MatchingRequest>({
    userId: '',
    preferredSkills: [],
    sessionType: 'learning',
    maxDuration: 60,
    urgency: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setMatchingRequest(prev => ({ ...prev, userId: user.id }));
      fetchQueueStats();
    }
  }, [user]);

  const fetchQueueStats = async () => {
    try {
      const response = await fetch('/api/queue/stats');
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const handleFindMatch = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Add to queue
      const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchingRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to join matching queue');
      }

      setIsInQueue(true);

      // Try to find a match
      const matchResponse = await fetch('/api/match/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchingRequest)
      });

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        if (matchData.match) {
          // Redirect to session
          window.location.href = `/call/${matchData.sessionId}`;
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await fetch('/api/queue/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      setIsInQueue(false);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !matchingRequest.preferredSkills.includes(skill)) {
      setMatchingRequest(prev => ({
        ...prev,
        preferredSkills: [...prev.preferredSkills, skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setMatchingRequest(prev => ({
      ...prev,
      preferredSkills: prev.preferredSkills.filter(s => s !== skill)
    }));
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
          <p className="text-gray-300 mb-6">Please log in to access the matching system.</p>
          <Link href="/auth">
            <GlassButton>Sign In</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AI-Powered Matching</h1>
          <p className="text-gray-300">Find your perfect learning partner with our intelligent matching system</p>
        </div>

        {/* Queue Statistics */}
        {queueStats && (
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4">Queue Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{queueStats.totalInQueue}</div>
                <div className="text-sm text-gray-300">Users in Queue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{queueStats.averageWaitTime}min</div>
                <div className="text-sm text-gray-300">Avg Wait Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{(queueStats.successRate * 100).toFixed(1)}%</div>
                <div className="text-sm text-gray-300">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {queueStats.peakHours[0]?.hour || 'N/A'}
                </div>
                <div className="text-sm text-gray-300">Peak Hour</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Matching Form */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-6">Matching Preferences</h3>

          <div className="space-y-6">
            {/* Session Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Session Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['learning', 'teaching', 'collaboration'] as const).map((type) => (
                  <GlassButton
                    key={type}
                    variant={matchingRequest.sessionType === type ? 'primary' : 'ghost'}
                    onClick={() => setMatchingRequest(prev => ({ ...prev, sessionType: type }))}
                    className="capitalize"
                  >
                    {type}
                  </GlassButton>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Preferred Skills ({matchingRequest.preferredSkills.length}/5)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {matchingRequest.preferredSkills.map((skill) => (
                  <GlassBadge
                    key={skill}
                    variant="primary"
                    className="flex items-center gap-1"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 text-xs hover:text-red-300"
                    >
                      ×
                    </button>
                  </GlassBadge>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {['JavaScript', 'React', 'Python', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'GraphQL'].map((skill) => (
                  <GlassButton
                    key={skill}
                    variant="ghost"
                    size="sm"
                    onClick={() => addSkill(skill)}
                    disabled={matchingRequest.preferredSkills.includes(skill) || matchingRequest.preferredSkills.length >= 5}
                    className="text-xs"
                  >
                    + {skill}
                  </GlassButton>
                ))}
              </div>
            </div>

            {/* Duration & Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Max Duration</label>
                <select
                  value={matchingRequest.maxDuration}
                  onChange={(e) => setMatchingRequest(prev => ({ ...prev, maxDuration: parseInt(e.target.value) }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Urgency</label>
                <select
                  value={matchingRequest.urgency}
                  onChange={(e) => setMatchingRequest(prev => ({ ...prev, urgency: e.target.value as any }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low - Find best match</option>
                  <option value="medium">Medium - Balance quality & speed</option>
                  <option value="high">High - Match quickly</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            {!isInQueue ? (
              <GlassButton
                onClick={handleFindMatch}
                disabled={loading || matchingRequest.preferredSkills.length === 0}
                className="px-8 py-3"
              >
                {loading ? 'Finding Match...' : 'Find Learning Partner'}
              </GlassButton>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  <span className="text-blue-400">Searching for match...</span>
                </div>
                <GlassButton
                  variant="ghost"
                  onClick={handleLeaveQueue}
                  className="text-sm"
                >
                  Leave Queue
                </GlassButton>
              </div>
            )}
          </div>
        </GlassCard>

        {/* How It Works */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">How AI Matching Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">Skill Analysis</h4>
              <p className="text-sm text-gray-300">AI analyzes your skills and learning goals</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">Time Matching</h4>
              <p className="text-sm text-gray-300">Finds partners in compatible timezones</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">Compatibility</h4>
              <p className="text-sm text-gray-300">Scores compatibility across multiple factors</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">Instant Match</h4>
              <p className="text-sm text-gray-300">Connects you with the best available partner</p>
            </div>
          </div>
        </GlassCard>

        {/* Tips */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Matching Tips</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Choose relevant skills</h4>
                <p className="text-sm text-gray-300">Select skills you want to learn or teach for better matches</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Peak hours get faster matches</h4>
                <p className="text-sm text-gray-300">More users are online during peak hours for quicker matching</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Complete your profile</h4>
                <p className="text-sm text-gray-300">A complete profile helps the AI find better matches</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default MatchPage;
