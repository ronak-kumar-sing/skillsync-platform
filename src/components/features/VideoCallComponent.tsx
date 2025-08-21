'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSocket } from '@/hooks/useSocket';
import { useAccessibility } from '@/components/ui/AccessibilityProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { VideoCallControls } from './VideoCallControls';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { QualityFeedbackUI } from './QualityFeedbackUI';
import { ParticipantVideo } from './ParticipantVideo';

interface VideoCallComponentProps {
  sessionId: string;
  isInitiator?: boolean;
  onCallEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VideoCallComponent({
  sessionId,
  isInitiator = false,
  onCallEnd,
  onError,
  className
}: VideoCallComponentProps) {
  const { socket } = useSocket();
  const { announceMessage } = useAccessibility();
  const { enableAnimations } = usePerformance();

  // WebRTC hook with all the connection logic
  const {
    connectionState,
    isConnected,
    isConnecting,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    connectionQuality,
    currentQualityLevel,
    startConnection,
    closeConnection,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    error,
    clearError
  } = useWebRTC({
    socket,
    sessionId,
    isInitiator,
    autoStart: true
  });

  // UI state
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'speaker' | 'pip'>('grid');
  const [showQualityPanel, setShowQualityPanel] = useState(false);

  // Refs for video elements
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setIsControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);
  }, []);

  // Handle mouse movement to show controls
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Handle call end
  const handleCallEnd = useCallback(() => {
    closeConnection();
    announceMessage('Call ended');
    onCallEnd?.();
  }, [closeConnection, announceMessage, onCallEnd]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
      announceMessage(`Connection error: ${error}`);
    }
  }, [error, onError, announceMessage]);

  // Handle connection state changes
  useEffect(() => {
    switch (connectionState) {
      case 'connecting':
        announceMessage('Connecting to call...');
        break;
      case 'connected':
        announceMessage('Call connected successfully');
        break;
      case 'disconnected':
        announceMessage('Call disconnected');
        break;
      case 'failed':
        announceMessage('Call connection failed');
        break;
    }
  }, [connectionState, announceMessage]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        announceMessage('Entered fullscreen mode');
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        announceMessage('Exited fullscreen mode');
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [announceMessage]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when the video call is focused
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          toggleAudio();
          announceMessage(`Microphone ${isAudioEnabled ? 'muted' : 'unmuted'}`);
          break;
        case 'v':
          e.preventDefault();
          toggleVideo();
          announceMessage(`Camera ${isVideoEnabled ? 'disabled' : 'enabled'}`);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape':
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'q':
          e.preventDefault();
          setShowQualityPanel(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAudioEnabled, isVideoEnabled, isFullscreen, toggleAudio, toggleVideo, toggleFullscreen, announceMessage]);

  // Layout variants for different screen sizes
  const getLayoutClasses = () => {
    switch (layout) {
      case 'speaker':
        return 'flex flex-col';
      case 'pip':
        return 'relative';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden',
        'focus-within:ring-2 focus-within:ring-primary-400/50',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      onMouseMove={handleMouseMove}
      onTouchStart={resetControlsTimeout}
      tabIndex={0}
      role="application"
      aria-label="Video call interface"
    >
      {/* Connection Status Overlay */}
      <AnimatePresence>
        {(isConnecting || connectionState === 'failed') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <GlassCard variant="medium" blur="lg" className="p-6 text-center">
              {isConnecting ? (
                <>
                  <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg">Connecting to call...</p>
                  <p className="text-white/70 text-sm mt-2">Please wait while we establish the connection</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-white text-lg">Connection Failed</p>
                  <p className="text-white/70 text-sm mt-2">{error || 'Unable to establish connection'}</p>
                  <div className="flex gap-2 mt-4">
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        clearError();
                        startConnection();
                      }}
                    >
                      Retry
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={handleCallEnd}
                    >
                      End Call
                    </GlassButton>
                  </div>
                </>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Streams Container */}
      <div className={cn('w-full h-full p-4', getLayoutClasses())}>
        {/* Local Video */}
        <ParticipantVideo
          stream={localStream}
          isLocal={true}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          participantName="You"
          layout={layout}
          className={cn(
            layout === 'pip' && remoteStream && 'absolute bottom-4 right-4 w-48 h-36 z-30'
          )}
        />

        {/* Remote Video */}
        {remoteStream && (
          <ParticipantVideo
            stream={remoteStream}
            isLocal={false}
            participantName="Partner"
            layout={layout}
            className={cn(
              layout === 'pip' && 'w-full h-full'
            )}
          />
        )}

        {/* Waiting for Partner */}
        {!remoteStream && isConnected && (
          <div className="flex items-center justify-center h-full">
            <GlassCard variant="medium" blur="md" className="p-8 text-center">
              <div className="w-12 h-12 bg-primary-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-white text-lg mb-2">Waiting for partner to join...</p>
              <p className="text-white/70 text-sm">They will appear here once connected</p>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator
        connectionState={connectionState}
        connectionQuality={connectionQuality}
        className="absolute top-4 left-4 z-30"
      />

      {/* Quality Panel */}
      <AnimatePresence>
        {showQualityPanel && (
          <QualityFeedbackUI
            connectionQuality={connectionQuality}
            currentQualityLevel={currentQualityLevel}
            onClose={() => setShowQualityPanel(false)}
            className="absolute top-4 right-4 z-30"
          />
        )}
      </AnimatePresence>

      {/* Call Controls */}
      <AnimatePresence>
        {isControlsVisible && (
          <VideoCallControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            isConnected={isConnected}
            layout={layout}
            isFullscreen={isFullscreen}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onStartScreenShare={startScreenShare}
            onStopScreenShare={stopScreenShare}
            onToggleFullscreen={toggleFullscreen}
            onLayoutChange={setLayout}
            onShowQuality={() => setShowQualityPanel(true)}
            onEndCall={handleCallEnd}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30"
          />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <div className="sr-only" aria-live="polite">
        Press M to toggle microphone, V to toggle camera, F for fullscreen, Q for quality panel, Escape to exit fullscreen
      </div>
    </div>
  );
}