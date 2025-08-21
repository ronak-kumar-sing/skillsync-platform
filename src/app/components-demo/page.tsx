'use client';

import { useState } from 'react';
import {
  GlassCard,
  GlassButton,
  GlassModal,
  GlassContainer,
  GlassNavigation,
  GlassGrid,
  GlassGridItem,
  GlassFlex,
  GlassFlexItem,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  GlassBadge,
  GlassProgress,
  GlassCircularProgress,
  LoadingSkeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonProfile,
  SkeletonDashboard,
  ThemeToggle,
  ToastProvider,
  useToast
} from '@/components/ui';
import { AppLayout } from '@/components/layout';

function ComponentsDemoContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skill: '',
    bio: ''
  });
  const [progress, setProgress] = useState(65);
  const toast = useToast();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            SkillSync UI Components
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Showcase of glassmorphism components with modern design and accessibility features
          </p>
        </div>

        {/* Theme Controls */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Theme System</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <ThemeToggle variant="button" />
            <ThemeToggle variant="switch" />
            <ThemeToggle variant="dropdown" />
          </div>
        </GlassCard>

        {/* Glass Cards */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Glass Cards</h2>
          <GlassGrid cols={4} responsive={{ mobile: 1, tablet: 2, desktop: 4 }} gap="lg">
            <GlassGridItem>
              <GlassCard variant="light" className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Light Variant</h3>
                <p className="text-white/70">Light glassmorphism effect with subtle transparency.</p>
              </GlassCard>
            </GlassGridItem>

            <GlassGridItem>
              <GlassCard variant="medium" className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Medium Variant</h3>
                <p className="text-white/70">Medium glassmorphism effect with balanced opacity.</p>
              </GlassCard>
            </GlassGridItem>

            <GlassGridItem>
              <GlassCard variant="dark" className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Dark Variant</h3>
                <p className="text-white/70">Dark glassmorphism effect with deeper transparency.</p>
              </GlassCard>
            </GlassGridItem>

            <GlassGridItem>
              <GlassCard variant="gradient" glow className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Gradient Variant</h3>
                <p className="text-white/70">Gradient glassmorphism with glow effect.</p>
              </GlassCard>
            </GlassGridItem>
          </GlassGrid>
        </GlassCard>

        {/* Layout Components */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Layout Components</h2>

          {/* Container Demo */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Glass Container</h3>
              <GlassContainer variant="section" padding="lg" maxWidth="2xl" center>
                <div className="text-center">
                  <h4 className="text-white font-semibold mb-2">Centered Container</h4>
                  <p className="text-white/70">This container is centered with max-width constraints and glassmorphism styling.</p>
                </div>
              </GlassContainer>
            </div>

            {/* Flex Layout Demo */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Glass Flex Layout</h3>
              <GlassFlex justify="between" align="center" gap="md" className="bg-white/5 p-4 rounded-xl">
                <GlassFlexItem>
                  <div className="text-white">
                    <h4 className="font-semibold">Flex Item 1</h4>
                    <p className="text-white/70 text-sm">Auto-sized content</p>
                  </div>
                </GlassFlexItem>
                <GlassFlexItem flex="1">
                  <div className="text-center text-white">
                    <h4 className="font-semibold">Flex Item 2</h4>
                    <p className="text-white/70 text-sm">Flexible content that grows</p>
                  </div>
                </GlassFlexItem>
                <GlassFlexItem>
                  <GlassButton variant="primary" size="sm">Action</GlassButton>
                </GlassFlexItem>
              </GlassFlex>
            </div>

            {/* Grid Layout Demo */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Glass Grid Layout</h3>
              <GlassGrid cols={3} gap="md" staggerChildren animated>
                {Array.from({ length: 6 }).map((_, index) => (
                  <GlassGridItem key={index} span={index === 0 ? 2 : 1}>
                    <GlassCard className="p-4 h-24 flex items-center justify-center">
                      <span className="text-white font-medium">
                        Grid Item {index + 1}
                        {index === 0 && ' (Span 2)'}
                      </span>
                    </GlassCard>
                  </GlassGridItem>
                ))}
              </GlassGrid>
            </div>
          </div>
        </GlassCard>

        {/* Glass Buttons */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Glass Buttons</h2>
          <div className="space-y-4">
            {/* Button Variants */}
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="primary">Primary Button</GlassButton>
              <GlassButton variant="secondary">Secondary Button</GlassButton>
              <GlassButton variant="accent">Accent Button</GlassButton>
              <GlassButton variant="ghost">Ghost Button</GlassButton>
              <GlassButton variant="gradient" glow>Gradient Button</GlassButton>
            </div>

            {/* Button Sizes */}
            <div className="flex flex-wrap gap-4 items-center">
              <GlassButton size="xs">Extra Small</GlassButton>
              <GlassButton size="sm">Small</GlassButton>
              <GlassButton size="md">Medium</GlassButton>
              <GlassButton size="lg">Large</GlassButton>
              <GlassButton size="xl">Extra Large</GlassButton>
            </div>

            {/* Button States */}
            <div className="flex flex-wrap gap-4">
              <GlassButton
                loading
                variant="primary"
                onClick={() => { }}
              >
                Loading Button
              </GlassButton>

              <GlassButton
                disabled
                variant="secondary"
              >
                Disabled Button
              </GlassButton>

              <GlassButton
                variant="accent"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                With Icon
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Modal Demo */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Glass Modal</h2>
          <div className="space-y-4">
            <GlassButton
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Open Modal
            </GlassButton>

            <GlassModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Demo Modal"
              description="This is a glassmorphism modal with backdrop blur and smooth animations."
            >
              <div className="space-y-4">
                <p className="text-white/80">
                  This modal demonstrates the glassmorphism design with proper accessibility features,
                  keyboard navigation, and smooth animations.
                </p>

                <div className="flex gap-3 justify-end">
                  <GlassButton
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Confirm
                  </GlassButton>
                </div>
              </div>
            </GlassModal>
          </div>
        </GlassCard>

        {/* Loading Skeletons */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Loading Skeletons</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <GlassButton
                variant={showSkeletons ? "accent" : "primary"}
                onClick={() => setShowSkeletons(!showSkeletons)}
              >
                {showSkeletons ? 'Hide' : 'Show'} Skeletons
              </GlassButton>
            </div>

            {showSkeletons && (
              <div className="space-y-8">
                {/* Basic Skeletons */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Basic Skeletons</h3>
                  <div className="space-y-3">
                    <LoadingSkeleton variant="text" />
                    <LoadingSkeleton variant="text" lines={3} />
                    <div className="flex items-center space-x-4">
                      <LoadingSkeleton variant="circular" width="48px" height="48px" />
                      <div className="flex-1">
                        <LoadingSkeleton variant="text" width="60%" />
                        <LoadingSkeleton variant="text" width="40%" />
                      </div>
                    </div>
                    <LoadingSkeleton variant="rectangular" height="200px" />
                  </div>
                </div>

                {/* Skeleton Components */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Skeleton Card</h3>
                    <GlassCard>
                      <SkeletonCard />
                    </GlassCard>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Skeleton List</h3>
                    <GlassCard>
                      <SkeletonList items={3} />
                    </GlassCard>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Skeleton Profile</h3>
                  <GlassCard className="p-6">
                    <SkeletonProfile />
                  </GlassCard>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Skeleton Dashboard</h3>
                  <GlassCard className="p-6">
                    <SkeletonDashboard />
                  </GlassCard>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Form Components */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Form Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <GlassInput
                label="Full Name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <GlassInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
                helperText="We'll never share your email"
              />

              <GlassSelect
                label="Primary Skill"
                placeholder="Select a skill"
                value={formData.skill}
                onChange={(e) => setFormData(prev => ({ ...prev, skill: e.target.value }))}
                options={[
                  { value: 'javascript', label: 'JavaScript' },
                  { value: 'python', label: 'Python' },
                  { value: 'react', label: 'React' },
                  { value: 'nodejs', label: 'Node.js' },
                  { value: 'typescript', label: 'TypeScript' }
                ]}
              />
            </div>

            <div className="space-y-4">
              <GlassTextarea
                label="Bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={6}
                helperText="Share your learning goals and interests"
              />

              <div className="flex gap-3">
                <GlassButton
                  variant="primary"
                  onClick={() => toast.success('Profile updated successfully!')}
                >
                  Save Profile
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  onClick={() => setFormData({ name: '', email: '', skill: '', bio: '' })}
                >
                  Reset
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Badges and Progress */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Badges & Progress</h2>
          <div className="space-y-6">
            {/* Badges */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Badges</h3>
              <div className="flex flex-wrap gap-3">
                <GlassBadge variant="primary">Primary</GlassBadge>
                <GlassBadge variant="secondary">Secondary</GlassBadge>
                <GlassBadge variant="accent">Accent</GlassBadge>
                <GlassBadge variant="success">Success</GlassBadge>
                <GlassBadge variant="warning">Warning</GlassBadge>
                <GlassBadge variant="error">Error</GlassBadge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-white/70">Status:</span>
                <GlassBadge variant="success" dot pulse />
                <span className="text-white/70">Online</span>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Progress Indicators</h3>
              <div className="space-y-4">
                <GlassProgress
                  label="JavaScript Proficiency"
                  value={progress}
                  variant="primary"
                  showValue
                />
                <GlassProgress
                  label="React Skills"
                  value={80}
                  variant="secondary"
                  showValue
                />
                <GlassProgress
                  label="Node.js Experience"
                  value={45}
                  variant="accent"
                  showValue
                />

                <div className="flex items-center gap-4 pt-4">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    Decrease
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    Increase
                  </GlassButton>
                </div>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Circular Progress</h3>
              <div className="flex flex-wrap gap-6">
                <GlassCircularProgress value={75} variant="primary" />
                <GlassCircularProgress value={60} variant="secondary" size={100} />
                <GlassCircularProgress value={90} variant="success" size={80} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Toast Notifications */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Toast Notifications</h2>
          <div className="flex flex-wrap gap-3">
            <GlassButton
              variant="primary"
              onClick={() => toast.success('Success! Your profile has been updated.')}
            >
              Success Toast
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={() => toast.error('Error! Something went wrong.')}
            >
              Error Toast
            </GlassButton>
            <GlassButton
              variant="accent"
              onClick={() => toast.warning('Warning! Please check your input.')}
            >
              Warning Toast
            </GlassButton>
            <GlassButton
              variant="ghost"
              onClick={() => toast.info('Info: New features are available!')}
            >
              Info Toast
            </GlassButton>
          </div>
        </GlassCard>

        {/* Interactive Examples */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Interactive Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Hover Card */}
            <GlassCard hover className="p-6 cursor-pointer">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Hover Effect</h3>
                <p className="text-white/70 text-sm">Hover over this card to see the glass effect animation</p>
              </div>
            </GlassCard>

            {/* Stats Card */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-white">1,234</p>
                  <GlassBadge variant="success" size="sm">+12%</GlassBadge>
                </div>
                <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </GlassCard>

            {/* Feature Card */}
            <GlassCard className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Matching</h3>
                <p className="text-white/70 text-sm">AI-powered algorithm finds perfect learning partners</p>
                <div className="mt-3">
                  <GlassProgress value={85} variant="secondary" size="sm" />
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>
      </div>
    </AppLayout >
  );
}
export default function ComponentsDemo() {
  return (
    <ToastProvider>
      <ComponentsDemoContent />
    </ToastProvider>
  );
}