'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { MobileVideoCall } from '@/components/features/MobileVideoCall';
import { VideoCallComponent } from '@/components/features/VideoCallComponent';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface CallPageProps {
  params: {
    sessionId: string;
  };
}

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const { isMobile, isTablet, orientation } = useResponsive();
  const { enableAnimations } = usePerformance();

  const sessionId = params?.sessionId as string;

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callError, setCallError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Initialize media on mount
  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard');
      return;
    }

    initializeMedia();
  }, [sessionId, router]);

  const initializeMedia = async () => {
    try {
      setIsConnecting(true);

      // Get user media with mobile-optimized constraints
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
          frameRate: { ideal: isMobile ? 15 : 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setIsCallActive(true);
      setIsConnecting(false);

      // Simulate connection delay
      setTimeout(() => {
        // In a real app, this would be handled by WebRTC connection
        // For demo purposes, we'll simulate a remote stream
        setRemoteStream(stream.clone());
      }, 2000);

    } catch (error) {
      console.error('Failed to initialize media:', error);
      setCallError('Failed to access camera or microphone');
      setIsConnecting(false);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleToggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleCamera = async () => {
    if (!localStream || !isMobile) return;

    try {
      // Stop current video track
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());

      // Get new stream with opposite camera
      const currentFacingMode = videoTracks[0]?.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 },
          facingMode: newFacingMode
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Replace video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = localStream.getVideoTracks()[0];

      // Update local stream
      localStream.removeTrack(videoTracks[0]);
      localStream.addTrack(newVideoTrack);
      setLocalStream(localStream);

    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  const handleEndCall = () => {
    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Navigate back
    router.push('/dashboard');
  };

  // Loading state
  if (isConnecting) {
    return (
      <MobileLayout showNavigation={false}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <GlassCard variant="medium" blur="lg" className="p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Connecting to call...
            </h2>
            <p className="text-white/70 text-sm mb-6">
              Please wait while we set up your video call
            </p>
            <GlassButton
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Cancel
            </GlassButton>
          </GlassCard>
        </div>
      </MobileLayout>
    );
  }

  // Error state
  if (callError) {
    return (
      <MobileLayout showNavigation={false}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <GlassCard variant="medium" blur="lg" className="p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Connection Failed
            </h2>
            <p className="text-white/70 text-sm mb-6">
              {callError}
            </p>
            <div className="flex gap-3">
              <GlassButton
                variant="primary"
                onClick={initializeMedia}
                className="flex-1"
              >
                Retry
              </GlassButton>
              <GlassButton
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Back
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </MobileLayout>
    );
  }

  // Render appropriate video call component based on device
  const VideoCallWrapper = isMobile || isTablet ? MobileVideoCall : VideoCallComponent;

  return (
    <MobileLayout showNavigation={false} className="bg-black">
      <div className={cn(
        'w-full h-full',
        orientation === 'landscape' && isMobile && 'fixed inset-0'
      )}>
        {isMobile || isTablet ? (
          <MobileVideoCall
            sessionId={sessionId}
            localStream={localStream || undefined}
            remoteStream={remoteStream || undefined}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isConnected={!!remoteStream}
            onToggleVideo={handleToggleVideo}
            onToggleAudio={handleToggleAudio}
            onEndCall={handleEndCall}
            onToggleCamera={handleToggleCamera}
            className="h-full"
          />
        ) : (
          <VideoCallComponent
            sessionId={sessionId}
            onCallEnd={handleEndCall}
            onError={setCallError}
            className="h-full"
          />
        )}
      </div>

      {/* Mobile-specific overlays */}
      {isMobile && (
        <>
          {/* Status bar spacer for iOS */}
          <div className="absolute top-0 left-0 right-0 h-safe bg-black/50 z-40" />

          {/* Home indicator spacer for iOS */}
          <div className="absolute bottom-0 left-0 right-0 h-safe bg-black/50 z-40" />
        </>
      )}
    </MobileLayout>
  );
}

// Metadata for the page
export const metadata = {
  title: 'Video Call - SkillSync',
  description: 'Join your SkillSync video call session',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  }
};