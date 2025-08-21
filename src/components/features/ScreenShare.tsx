'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { ScreenShareState } from '@/types';

interface ScreenShareProps {
  screenShareState: ScreenShareState;
  onStartShare: () => Promise<void>;
  onStopShare: () => void;
  onQualityChange?: (quality: 'low' | 'medium' | 'high') => void;
  className?: string;
}

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low (480p)' },
  { value: 'medium', label: 'Medium (720p)' },
  { value: 'high', label: 'High (1080p)' }
];

export function ScreenShare({
  screenShareState,
  onStartShare,
  onStopShare,
  onQualityChange,
  className = ''
}: ScreenShareProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle screen share stream
  useEffect(() => {
    if (screenShareState.isSharing && screenShareState.streamId && videoRef.current) {
      // In a real implementation, you would get the stream from WebRTC
      // For now, we'll simulate it
      const video = videoRef.current;

      // This would be replaced with actual stream handling
      video.srcObject = null; // Placeholder

      video.onloadedmetadata = () => {
        video.play().catch(console.error);
      };
    }
  }, [screenShareState.isSharing, screenShareState.streamId]);

  // Handle start screen sharing
  const handleStartShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onStartShare();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start screen sharing');
    } finally {
      setIsLoading(false);
    }
  }, [onStartShare]);

  // Handle stop screen sharing
  const handleStopShare = useCallback(() => {
    onStopShare();
    setError(null);
  }, [onStopShare]);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle quality change
  const handleQualityChange = useCallback((quality: string) => {
    if (onQualityChange) {
      onQualityChange(quality as 'low' | 'medium' | 'high');
    }
  }, [onQualityChange]);

  // Check if browser supports screen sharing
  const supportsScreenShare = typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia;

  if (!supportsScreenShare) {
    return (
      <GlassCard className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-white/60">
          <div className="text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold mb-2">Screen Sharing Not Supported</h3>
          <p className="text-sm">Your browser doesn't support screen sharing.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`relative h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Screen Share</h3>
          {screenShareState.isSharing && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-300">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {screenShareState.isSharing && onQualityChange && (
            <GlassSelect
              value={screenShareState.quality}
              onChange={(e) => handleQualityChange(e.target.value)}
              options={QUALITY_OPTIONS}
              className="w-32"
            />
          )}

          {screenShareState.hasAudio && (
            <div className="flex items-center gap-1 text-xs text-green-300">
              <span>🎵</span>
              <span>Audio</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-black/20">
        {!screenShareState.isSharing ? (
          /* Not sharing - show start button */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-6">🖥️</div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Share Your Screen
              </h3>
              <p className="text-white/60 mb-6 max-w-md">
                Share your entire screen, a specific window, or a browser tab with your learning partner.
              </p>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <GlassButton
                onClick={handleStartShare}
                loading={isLoading}
                disabled={isLoading}
                className="px-8 py-3"
              >
                {isLoading ? 'Starting...' : 'Start Sharing'}
              </GlassButton>
            </div>
          </div>
        ) : (
          /* Sharing - show video */
          <div className="h-full relative">
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              autoPlay
              muted
              playsInline
            />

            {/* Video controls overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200">
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-sm">
                    Sharing {screenShareState.sharerUserId ? 'with partner' : 'screen'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={handleFullscreenToggle}
                  >
                    {isFullscreen ? '⤓' : '⤢'}
                  </GlassButton>

                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={handleStopShare}
                    className="text-red-300 hover:text-red-200"
                  >
                    Stop Sharing
                  </GlassButton>
                </div>
              </div>
            </div>

            {/* Connection status */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-white">Connected</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {screenShareState.isSharing && (
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span>Quality: {screenShareState.quality}</span>
            <span>•</span>
            <span>Audio: {screenShareState.hasAudio ? 'On' : 'Off'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">
              Screen sharing active
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}