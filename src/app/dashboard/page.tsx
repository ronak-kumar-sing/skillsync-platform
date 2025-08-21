'use client';

import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { ToastProvider } from '@/components/ui';
import { DashboardOverview } from '@/components/features/DashboardOverview';
import { RealTimeMetrics } from '@/components/features/RealTimeMetrics';
import { UserProgressTracker } from '@/components/features/UserProgressTracker';
import { ActivityFeed } from '@/components/features/ActivityFeed';

export default function DashboardPage() {
  return (
    <ToastProvider>
      <AppLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-2"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Track your learning progress and platform activity in real-time
            </p>
          </motion.div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <DashboardOverview />
              </motion.div>

              {/* Real-time Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <RealTimeMetrics />
              </motion.div>

              {/* User Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <UserProgressTracker />
              </motion.div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Activity Feed */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <ActivityFeed />
              </motion.div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}