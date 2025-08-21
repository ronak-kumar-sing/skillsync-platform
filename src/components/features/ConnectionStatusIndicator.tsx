'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { ConnectionState, ConnectionQuality } from '@/services/webrtc.service';

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality | null;
  className?: string;
}

export function ConnectionStatusIndicator({
  connectionState,
  connectionQuality,
  className
}: ConnectionStatusIndicatorProps) {
  // Get status color and icon based on connection state and quality
  const getStatusInfo = () => {
    if (connectionState === 'connecting') {
      return {
        color: 'yellow',
        icon: 'connecting',
        text: 'Connecting...',
        description: 'Establishing connection'
      };
    }

    if (connectionState === 'failed' || connectionState === 'disconnected') {
      return {
        color: 'red',
        icon: 'error',
        text: 'Disconnected',
        description: 'Connection lost'
      };
    }

    if (connectionState === 'connected' && connectionQuality) {
      const qualityColors = {
        excellent: 'green',
        good: 'green',
        fair: 'yellow',
        poor: 'orange',
        critical: 'red'
      };

      const qualityTexts = {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor',
        critical: 'Critical'
      };

      return {
        color: qualityColors[connectionQuality.level],
        icon: 'signal',
        text: qualityTexts[connectionQuality.level],
        description: `${Math.round(connectionQuality.score)}% quality`
      };
    }

    if (connectionState === 'connected') {
      return {
        color: 'green',
        icon: 'connected',
        text: 'Connected',
        description: 'Connection established'
      };
    }

    return {
      color: 'gray',
      icon: 'idle',
      text: 'Idle',
      description: 'Not connected'
    };
  };

  const statusInfo = getStatusInfo();

  // Color classes for different states
  const colorClasses = {
    green: 'text-green-400 bg-green-500/20 border-green-400/30',
    yellow: 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30',
    orange: 'text-orange-400 bg-orange-500/20 border-orange-400/30',
    red: 'text-red-400 bg-red-500/20 border-red-400/30',
    gray: 'text-gray-400 bg-gray-500/20 border-gray-400/30'
  };

  // Icons for different states
  const renderIcon = () => {
    switch (statusInfo.icon) {
      case 'connecting':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
        );

      case 'error':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );

      case 'signal':
        return (
          <div className="flex items-end gap-0.5">
            <div className={cn(
              'w-0.5 h-1.5 rounded-sm',
              connectionQuality && connectionQuality.score > 20 ? 'bg-current' : 'bg-current/30'
            )} />
            <div className={cn(
              'w-0.5 h-2 rounded-sm',
              connectionQuality && connectionQuality.score > 40 ? 'bg-current' : 'bg-current/30'
            )} />
            <div className={cn(
              'w-0.5 h-2.5 rounded-sm',
              connectionQuality && connectionQuality.score > 60 ? 'bg-current' : 'bg-current/30'
            )} />
            <div className={cn(
              'w-0.5 h-3 rounded-sm',
              connectionQuality && connectionQuality.score > 80 ? 'bg-current' : 'bg-current/30'
            )} />
          </div>
        );

      case 'connected':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );

      default:
        return (
          <div className="w-3 h-3 rounded-full bg-current/50" />
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={cn('relative group', className)}
      >
        <GlassCard
          variant="dark"
          blur="md"
          className={cn(
            'flex items-center gap-2 px-3 py-2 transition-all duration-200',
            colorClasses[statusInfo.color as keyof typeof colorClasses]
          )}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {renderIcon()}
          </div>

          {/* Status Text */}
          <span className="text-xs font-medium whitespace-nowrap">
            {statusInfo.text}
          </span>

          {/* Pulse Animation for Connecting State */}
          {statusInfo.icon === 'connecting' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-xl bg-current/10 pointer-events-none"
            />
          )}
        </GlassCard>

        {/* Detailed Tooltip */}
        <div className="absolute top-full mt-2 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
          <GlassCard variant="dark" blur="lg" className="p-3 min-w-max">
            <div className="text-xs text-white/90">
              <div className="font-medium mb-1">{statusInfo.text}</div>
              <div className="text-white/70 mb-2">{statusInfo.description}</div>

              {connectionQuality && (
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>Quality Score:</span>
                    <span className="font-mono">{Math.round(connectionQuality.score)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Latency:</span>
                    <span className="font-mono">{Math.round(connectionQuality.metrics.rtt)}ms</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Packet Loss:</span>
                    <span className="font-mono">{connectionQuality.metrics.packetLoss.toFixed(1)}%</span>
                  </div>
                  {connectionQuality.metrics.video.resolution && (
                    <div className="flex justify-between gap-4">
                      <span>Resolution:</span>
                      <span className="font-mono">{connectionQuality.metrics.video.resolution}</span>
                    </div>
                  )}
                  {connectionQuality.metrics.video.frameRate > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Frame Rate:</span>
                      <span className="font-mono">{Math.round(connectionQuality.metrics.video.frameRate)}fps</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}