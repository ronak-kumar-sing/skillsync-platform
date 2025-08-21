'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ConnectionQuality } from '@/services/webrtc.service';

interface QualityFeedbackUIProps {
  connectionQuality: ConnectionQuality | null;
  currentQualityLevel: string;
  onClose: () => void;
  className?: string;
}

export function QualityFeedbackUI({
  connectionQuality,
  currentQualityLevel,
  onClose,
  className
}: QualityFeedbackUIProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview');

  if (!connectionQuality) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn('w-80', className)}
      >
        <GlassCard variant="dark" blur="lg" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Connection Quality</h3>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
              aria-label="Close quality panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          </div>

          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Analyzing connection quality...</p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Quality level colors and descriptions
  const qualityInfo = {
    excellent: { color: 'green', description: 'Perfect connection quality' },
    good: { color: 'green', description: 'Good connection quality' },
    fair: { color: 'yellow', description: 'Acceptable connection quality' },
    poor: { color: 'orange', description: 'Poor connection quality' },
    critical: { color: 'red', description: 'Critical connection issues' }
  };

  const currentQualityInfo = qualityInfo[connectionQuality.level];

  // Quality score visualization
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Render quality metrics
  const renderMetrics = () => (
    <div className="space-y-3">
      {/* Overall Score */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/90 text-sm">Overall Quality</span>
          <span className="text-white font-mono text-sm">{Math.round(connectionQuality.score)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={cn('h-2 rounded-full transition-all duration-300', getScoreColor(connectionQuality.score))}
            style={{ width: `${connectionQuality.score}%` }}
          />
        </div>
      </div>

      {/* Latency */}
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Latency</span>
        <span className="text-white font-mono text-sm">{Math.round(connectionQuality.metrics.rtt)}ms</span>
      </div>

      {/* Jitter */}
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Jitter</span>
        <span className="text-white font-mono text-sm">{Math.round(connectionQuality.metrics.jitter)}ms</span>
      </div>

      {/* Packet Loss */}
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Packet Loss</span>
        <span className="text-white font-mono text-sm">{connectionQuality.metrics.packetLoss.toFixed(1)}%</span>
      </div>

      {/* Bandwidth */}
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Bandwidth</span>
        <div className="text-right">
          <div className="text-white font-mono text-xs">
            ↑ {Math.round(connectionQuality.metrics.bandwidth.upload)} kbps
          </div>
          <div className="text-white font-mono text-xs">
            ↓ {Math.round(connectionQuality.metrics.bandwidth.download)} kbps
          </div>
        </div>
      </div>
    </div>
  );

  // Render video/audio details
  const renderDetails = () => (
    <div className="space-y-4">
      {/* Video Quality */}
      <div>
        <h4 className="text-white/90 text-sm font-medium mb-2">Video Quality</h4>
        <div className="space-y-2 text-sm">
          {connectionQuality.metrics.video.resolution && (
            <div className="flex justify-between">
              <span className="text-white/70">Resolution</span>
              <span className="text-white font-mono">{connectionQuality.metrics.video.resolution}</span>
            </div>
          )}
          {connectionQuality.metrics.video.frameRate > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Frame Rate</span>
              <span className="text-white font-mono">{Math.round(connectionQuality.metrics.video.frameRate)} fps</span>
            </div>
          )}
          {connectionQuality.metrics.video.bitrate > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Bitrate</span>
              <span className="text-white font-mono">{Math.round(connectionQuality.metrics.video.bitrate)} kbps</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Quality */}
      <div>
        <h4 className="text-white/90 text-sm font-medium mb-2">Audio Quality</h4>
        <div className="space-y-2 text-sm">
          {connectionQuality.metrics.audio.bitrate > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Bitrate</span>
              <span className="text-white font-mono">{Math.round(connectionQuality.metrics.audio.bitrate)} kbps</span>
            </div>
          )}
          {connectionQuality.metrics.audio.sampleRate > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Sample Rate</span>
              <span className="text-white font-mono">{Math.round(connectionQuality.metrics.audio.sampleRate)} Hz</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Quality Level */}
      <div>
        <h4 className="text-white/90 text-sm font-medium mb-2">Adaptive Quality</h4>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            currentQualityLevel === 'high' ? 'bg-green-500' :
              currentQualityLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
          )} />
          <span className="text-white/90 text-sm capitalize">{currentQualityLevel} Quality</span>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
      className={cn('w-80', className)}
    >
      <GlassCard variant="dark" blur="lg" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              currentQualityInfo.color === 'green' ? 'bg-green-500' :
                currentQualityInfo.color === 'yellow' ? 'bg-yellow-500' :
                  currentQualityInfo.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
            )} />
            <h3 className="text-white font-semibold">Connection Quality</h3>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
            aria-label="Close quality panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </GlassButton>
        </div>

        {/* Quality Status */}
        <div className="p-4 border-b border-white/10">
          <div className="text-center">
            <div className={cn(
              'text-2xl font-bold mb-1',
              currentQualityInfo.color === 'green' ? 'text-green-400' :
                currentQualityInfo.color === 'yellow' ? 'text-yellow-400' :
                  currentQualityInfo.color === 'orange' ? 'text-orange-400' : 'text-red-400'
            )}>
              {connectionQuality.level.charAt(0).toUpperCase() + connectionQuality.level.slice(1)}
            </div>
            <p className="text-white/70 text-sm">{currentQualityInfo.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'details', label: 'Details' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-primary-400 bg-primary-500/10 border-b-2 border-primary-400'
                  : 'text-white/70 hover:text-white/90'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && renderMetrics()}
              {activeTab === 'details' && renderDetails()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Real-time monitoring</span>
            <span>Updated every 2s</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}