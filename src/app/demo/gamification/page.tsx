'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AchievementNotification, useTestAchievements } from '@/components/features/AchievementNotification';
import { GamificationDashboard } from '@/components/features/GamificationDashboard';
import { AchievementGallery } from '@/components/features/AchievementGallery';
import { Leaderboard } from '@/components/features/Leaderboard';

export default function GamificationDemo() {
  const [activeDemo, setActiveDemo] = useState<'dashboard' | 'achievements' | 'leaderboard' | 'notifications'>('dashboard');
  const { triggerTest } = useTestAchievements();

  const demos = [
    { id: 'dashboard', label: 'Full Dashboard', icon: '📊' },
    { id: 'achievements', label: 'Achievement Gallery', icon: '🏆' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🥇' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ];

  const renderDemo = () => {
    switch (activeDemo) {
      case 'dashboard':
        return <GamificationDashboard />;
      case 'achievements':
        return <AchievementGallery showProgress={true} />;
      case 'leaderboard':
        return <Leaderboard showFilters={true} />;
      case 'notifications':
        return (
          <GlassCard className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Achievement Notifications Demo</h3>
            <p className="text-white/70 mb-6">
              Click the buttons below to test different achievement notification animations.
              Each rarity has unique visual effects and animations.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <GlassButton
                onClick={() => triggerTest('common')}
                className="flex flex-col items-center space-y-2 p-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <span>Common</span>
              </GlassButton>

              <GlassButton
                onClick={() => triggerTest('rare')}
                className="flex flex-col items-center space-y-2 p-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">R</span>
                </div>
                <span>Rare</span>
              </GlassButton>

              <GlassButton
                onClick={() => triggerTest('epic')}
                className="flex flex-col items-center space-y-2 p-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">E</span>
                </div>
                <span>Epic</span>
              </GlassButton>

              <GlassButton
                onClick={() => triggerTest('legendary')}
                className="flex flex-col items-center space-y-2 p-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">L</span>
                </div>
                <span>Legendary</span>
              </GlassButton>
            </div>

            <div className="text-left space-y-4">
              <h4 className="text-lg font-semibold text-white">Features Demonstrated:</h4>
              <ul className="text-white/70 space-y-2">
                <li>• Rarity-based visual effects and animations</li>
                <li>• Particle effects for epic and legendary achievements</li>
                <li>• Auto-advancing notification queue</li>
                <li>• Skip functionality for user control</li>
                <li>• Responsive design for all screen sizes</li>
                <li>• Accessibility-compliant interactions</li>
              </ul>
            </div>
          </GlassCard>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🎮 Gamification System Demo
          </h1>
          <p className="text-white/70 text-lg">
            Comprehensive achievement tracking, leaderboards, and progress visualization
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            {demos.map((demo) => (
              <button
                key={demo.id}
                onClick={() => setActiveDemo(demo.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md
                  font-medium transition-all duration-200
                  ${activeDemo === demo.id
                    ? 'bg-accent-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <span className="text-lg">{demo.icon}</span>
                <span>{demo.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Demo Content */}
        <motion.div
          key={activeDemo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderDemo()}
        </motion.div>

        {/* Feature Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <GlassCard className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🚀 Implemented Features</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">🏆 Achievement System</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Multi-criteria achievement tracking</li>
                  <li>• Progress calculation and visualization</li>
                  <li>• Rarity-based point system</li>
                  <li>• Category-based organization</li>
                  <li>• Real-time achievement checking</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">🔔 Notification System</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Animated achievement notifications</li>
                  <li>• Rarity-specific visual effects</li>
                  <li>• Queue management system</li>
                  <li>• Particle effects for rare achievements</li>
                  <li>• Skip and auto-advance functionality</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">🥇 Leaderboard System</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Multiple ranking categories</li>
                  <li>• Time-based filtering</li>
                  <li>• Skill-specific leaderboards</li>
                  <li>• Real-time rank updates</li>
                  <li>• User position tracking</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">📊 Progress Tracking</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Learning streak calculation</li>
                  <li>• Session statistics</li>
                  <li>• Skill progression metrics</li>
                  <li>• Achievement point accumulation</li>
                  <li>• Performance analytics</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">🎨 Visual Design</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Glassmorphism UI components</li>
                  <li>• Smooth animations and transitions</li>
                  <li>• Responsive design</li>
                  <li>• Accessibility compliance</li>
                  <li>• Dark theme optimization</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">⚡ Performance</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Efficient database queries</li>
                  <li>• Optimized React components</li>
                  <li>• Lazy loading and caching</li>
                  <li>• Real-time updates via WebSocket</li>
                  <li>• Mobile-optimized interactions</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Achievement Notification Overlay */}
      <AchievementNotification />
    </div>
  );
}