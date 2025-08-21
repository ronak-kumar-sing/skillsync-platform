'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAccessibility } from '@/components/ui/AccessibilityProvider';

interface VideoCallControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
  layout: 'grid' | 'speaker' | 'pip';
  isFullscreen: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  onToggleFullscreen: () => void;
  onLayoutChange: (layout: 'grid' | 'speaker' | 'pip') => void;
  onShowQuality: () => void;
  onEndCall: () => void;
  className?: string;
}

export function VideoCallControls({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isConnected,
  layout,
  isFullscreen,
  onToggleVideo,
  onToggleAudio,
  onStartScreenShare,
  onStopScreenShare,
  onToggleFullscreen,
  onLayoutChange,
  onShowQuality,
  onEndCall,
  className
}: VideoCallControlsProps) {
  const { announceMessage } = useAccessibility();
  const [isScreenShareLoading, setIsScreenShareLoading] = useState(false);

  const handleScreenShare = async () => {
    setIsScreenShareLoading(true);
    try {
      if (isScreenSharing) {
        await onStopScreenShare();
        announceMessage('Screen sharing stopped');
      } else {
        await onStartScreenShare();
        announceMessage('Screen sharing started');
      }
    } catch (error) {
      announceMessage('Failed to toggle screen sharing');
    } finally {
      setIsScreenShareLoading(false);
    }
  };

  const handleLayoutChange = (newLayout: 'grid' | 'speaker' | 'pip') => {
    onLayoutChange(newLayout);
    announceMessage(`Layout changed to ${newLayout}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-2', className)}
    >
      <GlassCard
        variant="dark"
        blur="lg"
        shadow
        className="flex items-center gap-2 p-3"
      >
        {/* Audio Control */}
        <GlassButton
          variant={isAudioEnabled ? 'ghost' : 'accent'}
          size="md"
          onClick={onToggleAudio}
          disabled={!isConnected}
          className={cn(
            'p-3 rounded-xl transition-colors',
            !isAudioEnabled && 'bg-red-500/20 border-red-400/30 text-red-100'
          )}
          aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          title={`${isAudioEnabled ? 'Mute' : 'Unmute'} (M)`}
        >
          {isAudioEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1m0 0V7a3 3 0 013-3m3 3v11m3-6V7a3 3 0 00-3-3m-1 9l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
        </GlassButton>

        {/* Video Control */}
        <GlassButton
          variant={isVideoEnabled ? 'ghost' : 'accent'}
          size="md"
          onClick={onToggleVideo}
          disabled={!isConnected}
          className={cn(
            'p-3 rounded-xl transition-colors',
            !isVideoEnabled && 'bg-red-500/20 border-red-400/30 text-red-100'
          )}
          aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          title={`${isVideoEnabled ? 'Turn off' : 'Turn on'} camera (V)`}
        >
          {isVideoEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </GlassButton>

        {/* Screen Share Control */}
        <GlassButton
          variant={isScreenSharing ? 'primary' : 'ghost'}
          size="md"
          onClick={handleScreenShare}
          disabled={!isConnected || isScreenShareLoading}
          loading={isScreenShareLoading}
          className="p-3 rounded-xl"
          aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
          title={`${isScreenSharing ? 'Stop' : 'Start'} screen sharing`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </GlassButton>

        {/* Layout Control */}
        <div className="relative group">
          <GlassButton
            variant="ghost"
            size="md"
            className="p-3 rounded-xl"
            aria-label="Change layout"
            title="Change layout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </GlassButton>

          {/* Layout Dropdown */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <GlassCard variant="dark" blur="lg" className="p-2 min-w-max">
              <div className="flex flex-col gap-1">
                <GlassButton
                  variant={layout === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLayoutChange('grid')}
                  className="justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Grid
                </GlassButton>
                <GlassButton
                  variant={layout === 'speaker' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLayoutChange('speaker')}
                  className="justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                  </svg>
                  Speaker
                </GlassButton>
                <GlassButton
                  variant={layout === 'pip' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleLayoutChange('pip')}
                  className="justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V9z" />
                  </svg>
                  Picture-in-Picture
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Fullscreen Control */}
        <GlassButton
          variant="ghost"
          size="md"
          onClick={onToggleFullscreen}
          className="p-3 rounded-xl"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen (F)`}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </GlassButton>

        {/* Quality Panel Control */}
        <GlassButton
          variant="ghost"
          size="md"
          onClick={onShowQuality}
          className="p-3 rounded-xl"
          aria-label="Show connection quality"
          title="Show connection quality (Q)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </GlassButton>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* End Call */}
        <GlassButton
          variant="accent"
          size="md"
          onClick={onEndCall}
          className="p-3 rounded-xl bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30"
          aria-label="End call"
          title="End call"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.664 1.664M21 21l-1.664-1.664m0 0L3 3m16.336 16.336L3 3" />
          </svg>
        </GlassButton>
      </GlassCard>
    </motion.div>
  );
}