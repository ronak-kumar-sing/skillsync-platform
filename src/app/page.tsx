'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { GlassCard, GlassButton, ToastProvider } from '@/components/ui';

export default function Home() {
  return (
    <ToastProvider>
      <AppLayout>
        <div className="space-y-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-6"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-500 bg-clip-text text-transparent">
                SkillSync
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto">
              Connect, learn, and grow with AI-powered peer-to-peer learning through instant video calls
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <GlassButton variant="primary" size="lg">
                  Get Started
                </GlassButton>
              </Link>
              <Link href="/dashboard">
                <GlassButton variant="ghost" size="lg">
                  Go to Dashboard
                </GlassButton>
              </Link>
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <GlassCard interactive className="p-6 h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">AI-Powered Matching</h3>
                  <p className="text-white/70">
                    Our intelligent algorithm connects you with the perfect learning partners based on skills, goals, and compatibility.
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <GlassCard interactive className="p-6 h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-secondary-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Instant Video Calls</h3>
                  <p className="text-white/70">
                    High-quality WebRTC video calls with collaborative tools like code editors, whiteboards, and screen sharing.
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <GlassCard interactive className="p-6 h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-accent-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Progress Tracking</h3>
                  <p className="text-white/70">
                    Track your learning journey with detailed analytics, achievements, and personalized insights.
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-white mb-2">10,000+</div>
                  <div className="text-white/70">Active Learners</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">50,000+</div>
                  <div className="text-white/70">Learning Sessions</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">95%</div>
                  <div className="text-white/70">Match Success Rate</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="text-center space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to start learning?
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Join thousands of learners and start your journey today. Connect with peers, share knowledge, and grow together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <GlassButton variant="primary" size="lg">
                  Get Started
                </GlassButton>
              </Link>
              <Link href="/components-demo">
                <GlassButton variant="ghost" size="lg">
                  Learn More
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}
