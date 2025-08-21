'use client';

import React, { useState } from 'react';
import { SessionAnalytics, SessionHistory, SessionFeedbackForm } from '@/components/features';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { DetailedSessionFeedback } from '@/types';

export default function SessionAnalyticsDemo() {
  const [activeDemo, setActiveDemo] = useState<'analytics' | 'history' | 'feedback'>('analytics');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Mock user ID for demo
  const mockUserId = 'demo-user-123';

  const handleFeedbackSubmit = async (feedback: DetailedSessionFeedback) => {
    console.log('Feedback submitted:', feedback);
    // In a real app, this would call the API
    alert('Feedback submitted successfully! (Demo mode)');
    setShowFeedbackForm(false);
  };

  const demoSections = [
    {
      key: 'analytics',
      title: 'Session Analytics',
      description: 'Comprehensive learning analytics with insights and trends'
    },
    {
      key: 'history',
      title: 'Session History',
      description: 'Searchable session history with advanced filtering'
    },
    {
      key: 'feedback',
      title: 'Feedback System',
      description: 'Detailed session feedback collection and tracking'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Session Analytics & Insights Demo
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Explore comprehensive session analytics, searchable history, and detailed feedback collection
            that helps users track their learning progress and optimize their experience.
          </p>
        </div>

        {/* Demo Navigation */}
        <GlassCard className="p-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {demoSections.map((section) => (
              <div key={section.key} className="text-center">
                <GlassButton
                  variant={activeDemo === section.key ? 'primary' : 'ghost'}
                  onClick={() => setActiveDemo(section.key as any)}
                  className="mb-2"
                >
                  {section.title}
                </GlassButton>
                <p className="text-sm text-gray-400 max-w-48">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Demo Content */}
        <div className="space-y-6">
          {/* Session Analytics Demo */}
          {activeDemo === 'analytics' && (
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Session Analytics Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">📊 Overview Metrics</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Total sessions and learning hours</li>
                      <li>• Average ratings and completion rates</li>
                      <li>• Current and longest learning streaks</li>
                      <li>• Real-time progress tracking</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">📈 Performance Trends</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Weekly and monthly progress charts</li>
                      <li>• Session distribution analysis</li>
                      <li>• Learning velocity metrics</li>
                      <li>• Peak performance identification</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">🎯 Personalized Insights</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• AI-generated learning recommendations</li>
                      <li>• Pattern recognition and optimization</li>
                      <li>• Achievement progress tracking</li>
                      <li>• Custom improvement suggestions</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm">
                    <strong>Demo Note:</strong> The analytics component below will show placeholder data
                    since we're not connected to a real database. In production, this would display
                    real user analytics with interactive charts and live data.
                  </p>
                </div>
              </GlassCard>

              <SessionAnalytics userId={mockUserId} />
            </div>
          )}

          {/* Session History Demo */}
          {activeDemo === 'history' && (
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Session History Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">🔍 Advanced Search & Filtering</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Full-text search across sessions</li>
                      <li>• Filter by session type, rating, date range</li>
                      <li>• Partner-specific session filtering</li>
                      <li>• Topic-based search and categorization</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">📋 Comprehensive Session Records</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Detailed session metadata and duration</li>
                      <li>• Partner information and ratings</li>
                      <li>• Topics covered and resources shared</li>
                      <li>• Feedback and learning outcomes</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    <strong>Demo Note:</strong> The history component will show "No sessions found"
                    since we're in demo mode. In production, users would see their complete session
                    history with powerful search and filtering capabilities.
                  </p>
                </div>
              </GlassCard>

              <SessionHistory userId={mockUserId} />
            </div>
          )}

          {/* Feedback System Demo */}
          {activeDemo === 'feedback' && (
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Session Feedback System</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">⭐ Multi-Dimensional Ratings</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Overall session rating (1-5 stars)</li>
                      <li>• Difficulty level assessment</li>
                      <li>• Session pace evaluation</li>
                      <li>• Communication quality rating</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">📝 Detailed Learning Tracking</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Skills learned and taught documentation</li>
                      <li>• Learning outcomes and achievements</li>
                      <li>• Technical issues reporting</li>
                      <li>• Shared resources cataloging</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <GlassButton
                    variant="primary"
                    onClick={() => setShowFeedbackForm(true)}
                  >
                    Try Feedback Form
                  </GlassButton>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex-1">
                    <p className="text-green-300 text-sm">
                      <strong>Interactive Demo:</strong> Click the button to try the comprehensive
                      feedback form with all its features including skill tracking, resource sharing,
                      and detailed assessments.
                    </p>
                  </div>
                </div>

                {showFeedbackForm && (
                  <SessionFeedbackForm
                    sessionId="demo-session-123"
                    partnerId="demo-partner-456"
                    partnerName="Alex Johnson"
                    onSubmit={handleFeedbackSubmit}
                    onCancel={() => setShowFeedbackForm(false)}
                  />
                )}

                {!showFeedbackForm && (
                  <GlassCard className="p-6 bg-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Feedback Form Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Basic Feedback</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• Star rating system</li>
                          <li>• General comments</li>
                          <li>• Partner recommendation</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Detailed Assessment</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• Multi-criteria ratings</li>
                          <li>• Skills tracking</li>
                          <li>• Learning outcomes</li>
                          <li>• Technical issues</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Resource Sharing</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• Links and files</li>
                          <li>• Code snippets</li>
                          <li>• Notes and documentation</li>
                          <li>• Resource categorization</li>
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                )}
            </div>
            </div>
          )}
      </div>

      {/* Implementation Highlights */}
      <GlassCard className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Implementation Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">🏗️ Architecture</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• RESTful API endpoints for all analytics</li>
              <li>• Comprehensive service layer with business logic</li>
              <li>• Type-safe interfaces and data models</li>
              <li>• Efficient database queries with pagination</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">🎨 User Experience</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Responsive glassmorphism design</li>
              <li>• Interactive charts and visualizations</li>
              <li>• Real-time data updates</li>
              <li>• Intuitive filtering and search</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">🔧 Technical Features</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Comprehensive test coverage</li>
              <li>• Error handling and validation</li>
              <li>• Performance optimization</li>
              <li>• Scalable data processing</li>
            </ul>
          </div>
        </div>
      </GlassCard>

      {/* API Endpoints */}
      <GlassCard className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">API Endpoints</h2>
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Session Analytics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">GET</span>
                <code className="text-gray-300">/api/sessions/analytics</code>
                <span className="text-gray-400">- Comprehensive user analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">GET</span>
                <code className="text-gray-300">/api/sessions/insights</code>
                <span className="text-gray-400">- Personalized learning insights</span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Session History</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">GET</span>
                <code className="text-gray-300">/api/sessions/history</code>
                <span className="text-gray-400">- Searchable session history</span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Session Feedback</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">POST</span>
                <code className="text-gray-300">/api/sessions/[id]/feedback</code>
                <span className="text-gray-400">- Submit detailed feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">GET</span>
                <code className="text-gray-300">/api/sessions/[id]/feedback</code>
                <span className="text-gray-400">- Retrieve session feedback</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
    </div >
  );
}