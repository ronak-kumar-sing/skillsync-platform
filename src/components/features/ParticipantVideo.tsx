'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAccessibility } from '@/components/ui/AccessibilityProvider';

interface ParticipantVideoProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isScreenSharing?: boolean;
  participantName: string;
  layout: 'grid' | 'speaker' | 'pip';
  className?: string;
}

export function ParticipantVideo({
  stream,
  isLocal = false,
  isVideoEnabled = true,
  isAudioEnabled = true,
  isScreenSharing = false,
  participantName,
  layout,
  className
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const { announceMessage } = useAccessibility();

  // Set up video stream
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) return;

    const handleLoadedMetadata = () => {
      setIsVideoLoaded(true);
      setVideoError(null);
    };

    const handleError = (error: Event) => {
      console.error('Video error:', error);
      setVideoError('Failed to load video stream');
      setIsVideoLoaded(false);
    };

    videoElement.srcObject = stream;
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    // Auto-play video
    videoElement.play().catch((error) => {
      console.error('Failed to play video:', error);
      setVideoError('Failed to play video');
    });

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleError);
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  // Announce video state changes
  useEffect(() => {
    if (isLocal) return; // Don't announce local video changes

    if (!isVideoEnabled) {
      announceMessage(`${participantName} turned off their camera`);
    } else if (isVideoLoaded) {
      announceMessage(`${participantName} turned on their camera`);
    }
  }, [isVideoEnabled, isVideoLoaded, participantName, announceMessage, isLocal]);

  // Get container size classes based on layout
  const getContainerClasses = () => {
    const baseClasses = 'relative overflow-hidden bg-black/20';

    switch (layout) {
      case 'speaker':
        return cn(
          baseClasses,
          isLocal ? 'w-32 h-24 rounded-lg' : 'flex-1 rounded-2xl'
        );
      case 'pip':
        return cn(
          baseClasses,
          isLocal ? 'w-full h-full rounded-lg' : 'w-full h-full rounded-2xl'
        );
      default: // grid
        return cn(baseClasses, 'w-full h-full rounded-2xl');
    }
  };

  // Generate avatar initials
  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(getContainerClasses(), className)}>
      <GlassCard
        variant="dark"
        blur="sm"
        border={false}
        className="w-full h-full relative"
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className={cn(
            'w-full h-full object-cover',
            isLocal && 'scale-x-[-1]', // Mirror local video
            (!isVideoEnabled || !isVideoLoaded || videoError) && 'opacity-0'
          )}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video to prevent feedback
          aria-label={`${participantName} video stream`}
        />

        {/* Video Placeholder */}
        {(!isVideoEnabled || !isVideoLoaded || videoError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
            <div className="text-center">
              {/* Avatar */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-500/20 border border-primary-400/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-lg md:text-xl font-semibold text-primary-100">
                  {getAvatarInitials(participantName)}
                </span>
              </div>

              {/* Status Text */}
              <p className="text-white/90 text-sm md:text-base font-medium mb-1">
                {participantName}
              </p>
              <p className="text-white/60 text-xs md:text-sm">
                {videoError ? 'Video unavailable' : !isVideoEnabled ? 'Camera off' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}

        {/* Screen Sharing Indicator */}
        {isScreenSharing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 left-3 z-10"
          >
            <GlassCard variant="dark" blur="md" className="px-2 py-1 flex items-center gap-1">
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-white/90">Screen</span>
            </GlassCard>
          </motion.div>
        )}

        {/* Audio Status Indicator */}
        {!isAudioEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 z-10"
          >
            <div className="w-8 h-8 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1m0 0V7a3 3 0 013-3m3 3v11m3-6V7a3 3 0 00-3-3m-1 9l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Participant Name Label */}
        <div className="absolute bottom-3 left-3 z-10">
          <GlassCard variant="dark" blur="md" className="px-2 py-1">
            <span className="text-xs text-white/90 font-medium">
              {participantName}
              {isLocal && ' (You)'}
            </span>
          </GlassCard>
        </div>

        {/* Connection Quality Indicator (for remote participants) */}
        {!isLocal && isVideoLoaded && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="flex items-center gap-1">
              {/* Signal strength bars */}
              <div className="flex items-end gap-0.5">
                <div className="w-1 h-2 bg-green-400 rounded-sm" />
                <div className="w-1 h-3 bg-green-400 rounded-sm" />
                <div className="w-1 h-4 bg-green-400 rounded-sm" />
                <div className="w-1 h-2 bg-gray-400/50 rounded-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {stream && !isVideoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/70">Loading video...</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <div className="text-center">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-red-400">{videoError}</p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}