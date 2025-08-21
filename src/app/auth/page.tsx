'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { GlassCard, GlassButton } from '@/components/ui';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-primary-400 to-secondary-500 bg-clip-text text-transparent">
                  SkillSync
                </span>
              </h1>
              <p className="text-white/70">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </p>
            </motion.div>
          </div>

          {/* Form Toggle */}
          <div className="flex mb-6 p-1 bg-white/10 rounded-lg">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${isLogin
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${!isLogin
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* Forms */}
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {isLogin ? (
              <LoginForm
                onSuccess={() => {
                  // Redirect to dashboard or home
                  window.location.href = '/dashboard';
                }}
              />
            ) : (
              <RegisterForm
                onSuccess={() => {
                  // Show success message or redirect
                  window.location.href = '/dashboard';
                }}
              />
            )}
          </motion.div>

          {/* Demo Account Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <div className="text-center">
              <p className="text-blue-200 text-sm font-medium mb-2">
                Demo Account Available
              </p>
              <p className="text-blue-200/70 text-xs mb-3">
                Use these credentials to explore the platform:
              </p>
              <div className="text-xs text-blue-200/60 space-y-1">
                <div>Email: demo@skillsync.com</div>
                <div>Password: demo123</div>
              </div>
            </div>
          </motion.div>

          {/* Social Login Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-white/60">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <GlassButton
                variant="ghost"
                className="w-full flex items-center justify-center space-x-2"
                disabled
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google</span>
              </GlassButton>

              <GlassButton
                variant="ghost"
                className="w-full flex items-center justify-center space-x-2"
                disabled
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
                <span>Twitter</span>
              </GlassButton>
            </div>

            <p className="text-center text-xs text-white/40 mt-4">
              Social login coming soon
            </p>
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
