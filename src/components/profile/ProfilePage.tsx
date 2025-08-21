'use client';

import React, { useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import ProfileCompletion from './ProfileCompletion';
import SkillsManager from './SkillsManager';
import LearningGoalsManager from './LearningGoalsManager';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'goals' | 'preferences'>('overview');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (stepId: string) => {
    switch (stepId) {
      case 'basic-info':
        setActiveTab('overview');
        break;
      case 'skills':
        setActiveTab('skills');
        break;
      case 'learning-goals':
        setActiveTab('goals');
        break;
      case 'preferences':
        setActiveTab('preferences');
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="h-64 bg-white/10 rounded-xl"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="h-96 bg-white/10 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6 flex items-center justify-center">
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl p-8 border border-red-500/20 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Error Loading Profile</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'skills', label: 'Skills', icon: '🎯' },
    { id: 'goals', label: 'Learning Goals', icon: '📚' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Management</h1>
          <p className="text-white/70">
            Complete your profile to start matching with other learners
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Completion Sidebar */}
          <div className="lg:col-span-1">
            <ProfileCompletion userId={profile.id} onStepClick={handleStepClick} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Basic Profile Info */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Username
                      </label>
                      <div className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white">
                        {profile.username}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Email
                      </label>
                      <div className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white">
                        {profile.email}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Timezone
                      </label>
                      <div className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white">
                        {profile.timezone}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Status
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${profile.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span className="text-white">
                          {profile.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                {profile.stats && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{profile.stats.totalSessions}</div>
                        <div className="text-sm text-white/70">Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{profile.skills.length}</div>
                        <div className="text-sm text-white/70">Skills</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{profile.learningGoals.length}</div>
                        <div className="text-sm text-white/70">Goals</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{profile.stats.achievementPoints}</div>
                        <div className="text-sm text-white/70">Points</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'skills' && (
              <SkillsManager userSkills={profile.skills} onSkillsChange={fetchProfile} />
            )}

            {activeTab === 'goals' && (
              <LearningGoalsManager learningGoals={profile.learningGoals} onGoalsChange={fetchProfile} />
            )}

            {activeTab === 'preferences' && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
                <p className="text-white/70">Preferences management coming soon...</p>
                {profile.preferences && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="text-white/70">Session Types: </span>
                      <span className="text-white">{profile.preferences.preferredSessionTypes.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-white/70">Max Duration: </span>
                      <span className="text-white">{profile.preferences.maxSessionDuration} minutes</span>
                    </div>
                    <div>
                      <span className="text-white/70">Communication Style: </span>
                      <span className="text-white">{profile.preferences.communicationStyle}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}