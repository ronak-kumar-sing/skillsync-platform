'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { MobileGlassCard } from '@/components/ui/MobileGlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface MobileVideoCallProps {
  sessionId: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isConnected?: boolean;
  onToggleVideo?: () => void;
  onToggleAudio?: () => void;
  onEndCall?: () => void;
  onToggleCamera?: () => void;
  className?: string;
}

export function MobileVideoCall({
  sessionId,
  localStream,
  remoteStream,
  isVideoEnabled = true,
  isAudioEnabled = true,
  isConnected = false,
  onToggleVideo,
  onToggleAudio,
  onEndCall,
  onToggleCamera,
  className
}: MobileVideoCallProps) {
  const { isMobile, orientation, screenWidth, screenHeight } = useResponsive();
  const { enableAnimations } = usePerformance();

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 0, y: 0 });

  // Auto-hide controls
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setIsControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 4000); // Longer timeout for mobile
  }, []);

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Touch gestures for video interaction
  const { attachListeners } = useTouchGestures({
    onTap: () => {
      resetControlsTimeout();
    },
    onDoubleTap: () => {
      if (remoteStream) {
        setIsPiPMode(prev => !prev);
      }
    },
    onSwipe: (gesture) => {
      if (gesture.direction === 'up' && !isControlsVisible) {
        setIsControlsVisible(true);
      } else if (gesture.direction === 'down' && isControlsVisible) {
        setIsControlsVisible(false);
      }
    }
  });

  // Attach touch listeners to container
  useEffect(() => {
    if (containerRef.current) {
      return attachListeners(containerRef.current);
    }
  }, [attachListeners]);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Reset PiP position on orientation change
      setLocalVideoPosition({ x: 0, y: 0 });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // Calculate video dimensions for mobile
  const getVideoContainerStyle = () => {
    if (orientation === 'landscape') {
      return {
        width: '100%',
        height: '100vh',
        maxHeight: screenHeight
      };
    } else {
      return {
        width: '100%',
        height: `${screenWidth * 0.75}px`, // 4:3 aspect ratio
        maxHeight: '60vh'
      };
    }
  };

  // PiP video positioning
  const getPiPStyle = () => {
    const size = orientation === 'landscape' ? 120 : 100;
    const margin = 16;

    return {
      width: `${size}px`,
      height: `${size * 0.75}px`,
      right: `${margin}px`,
      bottom: `${margin + 80}px`, // Account for controls
      transform: `translate(${localVideoPosition.x}px, ${localVideoPosition.y}px)`
    };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const controlsVariants = {
    hidden: {
      opacity: 0,
      y: 100,
      transition: { duration: 0.3 }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={enableAnimations ? "hidden" : "visible"}
      animate="visible"
      exit="exit"
      variants={enableAnimations ? containerVariants : undefined}
      className={cn(
        'relative w-full bg-black overflow-hidden',
        'touch-none select-none', // Prevent scrolling and selection
        isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl',
        orientation === 'landscape' && isMobile && 'h-screen',
        className
      )}
      style={getVideoContainerStyle()}
    >
      {/* Remote Video (Main) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className={cn(
            'w-full h-full object-cover',
            isPiPMode ? 'absolute inset-0' : 'relative'
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <MobileGlassCard variant="medium" className="p-6 text-center">
            <div className="w-16 h-16 bg-primary-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-white text-lg mb-2">Waiting for partner...</p>
            <p className="text-white/60 text-sm">They will appear here once connected</p>
          </MobileGlassCard>
        </div>
      )}

      {/* Local Video (PiP when remote is present) */}
      {localStream && (
        <motion.div
          className={cn(
            'absolute z-20 rounded-xl overflow-hidden border-2 border-white/20',
            remoteStream ? 'cursor-move' : 'inset-0'
          )}
          style={remoteStream ? getPiPStyle() : undefined}
          drag={remoteStream ? true : false}
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={containerRef}
          onDrag={(_, info) => {
            if (remoteStream) {
              setLocalVideoPosition({
                x: info.offset.x,
                y: info.offset.y
              });
            }
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-cover"
          />

          {/* Local video overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-medium">You</span>
          </div>

          {/* Video disabled overlay */}
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-30">
        <MobileGlassCard variant="dark" padding="sm" className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-400' : 'bg-red-400'
          )} />
          <span className="text-white text-xs font-medium">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </MobileGlassCard>
      </div>

      {/* Mobile Controls */}
      <AnimatePresence>
        {isControlsVisible && (
          <motion.div
            initial={enableAnimations ? "hidden" : "visible"}
            animate="visible"
            exit="hidden"
            variants={enableAnimations ? controlsVariants : undefined}
            className="absolute bottom-0 left-0 right-0 z-30 p-4"
          >
            <MobileGlassCard variant="dark" blur="xl" className="p-4">
              <div className="flex items-center justify-center gap-4">
                {/* Mute Button */}
                <GlassButton
                  variant={isAudioEnabled ? "ghost" : "danger"}
                  size="lg"
                  onClick={onToggleAudio}
                  className="w-14 h-14 rounded-full"
                  aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isAudioEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                </GlassButton>

                {/* Video Button */}
                <GlassButton
                  variant={isVideoEnabled ? "ghost" : "danger"}
                  size="lg"
                  onClick={onToggleVideo}
                  className="w-14 h-14 rounded-full"
                  aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isVideoEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    )}
                  </svg>
                </GlassButton>

                {/* End Call Button */}
                <GlassButton
                  variant="danger"
                  size="lg"
                  onClick={onEndCall}
                  className="w-14 h-14 rounded-full bg-red-500/20 border-red-400/30 text-red-300"
                  aria-label="End call"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.5 1.5m0 0L6 6m-1.5-1.5L3 6m1.5-1.5L6 3" />
                  </svg>
                </GlassButton>

                {/* Camera Switch Button (Mobile only) */}
                {isMobile && (
                  <GlassButton
                    variant="ghost"
                    size="lg"
                    onClick={onToggleCamera}
                    className="w-14 h-14 rounded-full"
                    aria-label="Switch camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </GlassButton>
                )}

                {/* Fullscreen Button */}
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={toggleFullscreen}
                  className="w-14 h-14 rounded-full"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                    )}
                  </svg>
                </GlassButton>
              </div>
            </MobileGlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Hints */}
      {!isControlsVisible && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <MobileGlassCard variant="dark" padding="sm" className="opacity-60">
            <p className="text-white text-xs">Tap to show controls • Swipe up for options</p>
          </MobileGlassCard>
        </div>
      )}
    </motion.div>
  );
}