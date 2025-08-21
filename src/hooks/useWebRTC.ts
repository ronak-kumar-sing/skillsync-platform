import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { WebRTCService, ConnectionState, WebRTCEvents, ConnectionQuality } from '@/services/webrtc.service';
import { useErrorHandler } from './useErrorHandler';
import { retryWebRTCConnection, SkillSyncError } from '@/lib/error-handling';
import { logger } from '@/lib/logging';
import { getBrowserInfo } from '@/lib/browser-detection';

interface UseWebRTCOptions {
  socket: Socket | null;
  sessionId: string | null;
  isInitiator?: boolean;
  autoStart?: boolean;
}

interface UseWebRTCReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;

  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Media controls
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;

  // Quality monitoring
  connectionQuality: ConnectionQuality | null;
  qualityHistory: ConnectionQuality[];
  currentQualityLevel: string;
  isAdaptiveStreamingEnabled: boolean;

  // Actions
  startConnection: () => Promise<void>;
  closeConnection: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  sendMessage: (message: any) => void;
  setStreamingQuality: (quality: 'high' | 'medium' | 'low') => Promise<void>;
  setAdaptiveStreaming: (enabled: boolean) => void;
  forceQualityCheck: () => Promise<void>;

  // Events
  onDataChannelMessage: (callback: (message: any) => void) => void;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useWebRTC({
  socket,
  sessionId,
  isInitiator = false,
  autoStart = false,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('new');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Enhanced error handling
  const errorHandler = useErrorHandler({
    maxRetries: 5,
    context: {
      sessionId: sessionId || undefined,
      component: 'useWebRTC',
      action: 'webrtc_connection'
    },
    retryOptions: {
      baseDelay: 2000,
      maxDelay: 15000,
      retryCondition: (error) => {
        // Don't retry permission errors
        return error.name !== 'NotAllowedError' &&
          error.name !== 'NotFoundError';
      }
    },
    onError: (error) => {
      logger.webrtc('WebRTC error occurred', {
        sessionId: sessionId || undefined,
        metadata: {
          error: error.message,
          code: error.code,
          connectionState,
          isInitiator
        }
      });
    },
    onRetry: (attempt, error) => {
      logger.webrtc(`WebRTC retry attempt ${attempt}`, {
        sessionId: sessionId || undefined,
        metadata: {
          error: error.message,
          attempt,
          connectionState
        }
      });
    },
    autoRetry: true
  });

  // Quality monitoring state
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [qualityHistory, setQualityHistory] = useState<ConnectionQuality[]>([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState<string>('high');
  const [isAdaptiveStreamingEnabled, setIsAdaptiveStreamingEnabledState] = useState(true);

  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const dataChannelCallbackRef = useRef<((message: any) => void) | null>(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!socket || !sessionId) {
      return;
    }

    const webrtcService = new WebRTCService(socket, sessionId);
    webrtcServiceRef.current = webrtcService;

    return () => {
      webrtcService.close();
      webrtcServiceRef.current = null;
    };
  }, [socket, sessionId]);

  // Auto-start connection if enabled
  useEffect(() => {
    if (autoStart && webrtcServiceRef.current && connectionState === 'new') {
      startConnection();
    }
  }, [autoStart, connectionState]);

  // Start WebRTC connection with enhanced error handling
  const startConnection = useCallback(async () => {
    if (!webrtcServiceRef.current) {
      const error = new SkillSyncError(
        'WebRTC service not initialized',
        'WEBRTC_FAILED',
        'high',
        'Video call service is not ready. Please refresh the page.'
      );
      errorHandler.handleError(error);
      return;
    }

    // Clear any previous errors
    errorHandler.clearError();

    // Log browser compatibility
    const browserInfo = getBrowserInfo();
    logger.webrtc('Starting WebRTC connection', {
      sessionId: sessionId || undefined,
      metadata: {
        isInitiator,
        browserInfo: {
          name: browserInfo.name,
          version: browserInfo.version,
          supportsWebRTC: browserInfo.supportsWebRTC
        }
      }
    });

    const events: WebRTCEvents = {
      onConnectionStateChange: (state) => {
        setConnectionState(state);

        logger.webrtc(`Connection state changed to ${state}`, {
          sessionId: sessionId || undefined,
          metadata: { state, isInitiator }
        });

        if (state === 'failed') {
          const error = new SkillSyncError(
            'WebRTC connection failed',
            'WEBRTC_FAILED',
            'high',
            'Video call connection failed. This might be due to network issues or firewall restrictions.'
          );
          errorHandler.handleError(error);
        } else if (state === 'disconnected') {
          const error = new SkillSyncError(
            'WebRTC connection disconnected',
            'WEBRTC_FAILED',
            'medium',
            'Video call was disconnected. Attempting to reconnect...'
          );
          errorHandler.handleError(error);
        } else if (state === 'connected') {
          // Clear any connection errors when successfully connected
          errorHandler.clearError();
        }
      },
      onLocalStream: (stream) => {
        setLocalStream(stream);
        // Initialize media control states
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        setIsVideoEnabled(videoTrack?.enabled ?? false);
        setIsAudioEnabled(audioTrack?.enabled ?? false);

        logger.webrtc('Local stream obtained', {
          sessionId: sessionId || undefined,
          metadata: {
            hasVideo: !!videoTrack,
            hasAudio: !!audioTrack,
            videoEnabled: videoTrack?.enabled,
            audioEnabled: audioTrack?.enabled
          }
        });
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);

        logger.webrtc('Remote stream received', {
          sessionId: sessionId || undefined,
          metadata: {
            hasVideo: stream.getVideoTracks().length > 0,
            hasAudio: stream.getAudioTracks().length > 0
          }
        });
      },
      onDataChannelMessage: (message) => {
        dataChannelCallbackRef.current?.(message);
      },
      onConnectionQualityChange: (quality) => {
        setConnectionQuality(quality);
        setQualityHistory(prev => {
          const newHistory = [...prev, quality];
          return newHistory.slice(-10); // Keep last 10 measurements
        });

        // Log quality issues
        if (quality.rating === 'poor') {
          logger.webrtc('Poor connection quality detected', {
            sessionId: sessionId || undefined,
            metadata: { quality }
          });
        }
      },
      onAdaptiveQualityChange: (newLevel) => {
        setCurrentQualityLevel(newLevel);

        logger.webrtc(`Quality adapted to ${newLevel}`, {
          sessionId: sessionId || undefined,
          metadata: { newLevel }
        });
      },
      onError: (err) => {
        const error = new SkillSyncError(
          err.message,
          'WEBRTC_FAILED',
          'high',
          undefined,
          {
            sessionId: sessionId || undefined,
            component: 'WebRTCService',
            action: 'webrtc_error'
          },
          err
        );
        errorHandler.handleError(error);
      },
    };

    // Use enhanced retry logic for WebRTC connection
    await errorHandler.executeWithErrorHandling(async () => {
      if (!webrtcServiceRef.current) {
        throw new Error('WebRTC service not available');
      }

      if (isInitiator) {
        await webrtcServiceRef.current.initializeAsInitiator(events);
      } else {
        await webrtcServiceRef.current.initializeAsReceiver(events);
      }
    });
  }, [isInitiator, sessionId, errorHandler]);

  // Close connection
  const closeConnection = useCallback(() => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
    }

    setConnectionState('closed');
    setLocalStream(null);
    setRemoteStream(null);
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);
    setIsScreenSharing(false);
    setConnectionQuality(null);
    setQualityHistory([]);
    setCurrentQualityLevel('high');
    setError(null);
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (webrtcServiceRef.current) {
      const enabled = webrtcServiceRef.current.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (webrtcServiceRef.current) {
      const enabled = webrtcServiceRef.current.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  }, []);

  // Start screen sharing with error handling
  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current) {
      const error = new SkillSyncError(
        'WebRTC service not available',
        'WEBRTC_FAILED',
        'medium',
        'Screen sharing is not available right now.'
      );
      errorHandler.handleError(error);
      return;
    }

    await errorHandler.executeWithErrorHandling(async () => {
      const screenStream = await webrtcServiceRef.current!.startScreenShare();
      if (screenStream) {
        setIsScreenSharing(true);

        logger.webrtc('Screen sharing started', {
          sessionId: sessionId || undefined,
          metadata: { hasVideoTrack: screenStream.getVideoTracks().length > 0 }
        });

        // Notify other participants
        if (socket && sessionId) {
          socket.emit('screen_share_start', { sessionId });
        }

        // Handle screen share end
        const videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = () => {
          logger.webrtc('Screen sharing ended by user', {
            sessionId: sessionId || undefined
          });
          stopScreenShare();
        };
      }
    }, {
      context: { action: 'start_screen_share' }
    });
  }, [socket, sessionId, errorHandler]);

  // Stop screen sharing with error handling
  const stopScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current) return;

    await errorHandler.executeWithErrorHandling(async () => {
      await webrtcServiceRef.current!.stopScreenShare();
      setIsScreenSharing(false);

      logger.webrtc('Screen sharing stopped', {
        sessionId: sessionId || undefined
      });

      // Notify other participants
      if (socket && sessionId) {
        socket.emit('screen_share_stop', { sessionId });
      }
    }, {
      skipRetry: true, // Don't retry stop operations
      context: { action: 'stop_screen_share' }
    });
  }, [socket, sessionId, errorHandler]);

  // Send message through data channel
  const sendMessage = useCallback((message: any) => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.sendMessage(message);
    }
  }, []);

  // Set data channel message callback
  const onDataChannelMessage = useCallback((callback: (message: any) => void) => {
    dataChannelCallbackRef.current = callback;
  }, []);

  // Set streaming quality with error handling
  const setStreamingQuality = useCallback(async (quality: 'high' | 'medium' | 'low') => {
    if (!webrtcServiceRef.current) return;

    await errorHandler.executeWithErrorHandling(async () => {
      await webrtcServiceRef.current!.setStreamingQuality(quality);
      setCurrentQualityLevel(quality);

      logger.webrtc(`Streaming quality set to ${quality}`, {
        sessionId: sessionId || undefined,
        metadata: { quality }
      });
    }, {
      skipRetry: true, // Don't retry quality changes
      context: { action: 'set_streaming_quality' }
    });
  }, [sessionId, errorHandler]);

  // Set adaptive streaming
  const setAdaptiveStreaming = useCallback((enabled: boolean) => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.setAdaptiveStreaming(enabled);
      setIsAdaptiveStreamingEnabledState(enabled);
    }
  }, []);

  // Force quality check with error handling
  const forceQualityCheck = useCallback(async () => {
    if (!webrtcServiceRef.current) return;

    await errorHandler.executeWithErrorHandling(async () => {
      const quality = await webrtcServiceRef.current!.forceQualityCheck();
      if (quality) {
        setConnectionQuality(quality);
        setQualityHistory(prev => {
          const newHistory = [...prev, quality];
          return newHistory.slice(-10); // Keep last 10 measurements
        });

        logger.webrtc('Quality check completed', {
          sessionId: sessionId || undefined,
          metadata: { quality }
        });
      }
    }, {
      skipRetry: true, // Don't retry quality checks
      context: { action: 'force_quality_check' }
    });
  }, [sessionId, errorHandler]);

  // Clear error (delegate to error handler)
  const clearError = useCallback(() => {
    errorHandler.clearError();
  }, [errorHandler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.close();
      }
    };
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',

    // Media streams
    localStream,
    remoteStream,

    // Media controls
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,

    // Quality monitoring
    connectionQuality,
    qualityHistory,
    currentQualityLevel,
    isAdaptiveStreamingEnabled,

    // Actions
    startConnection,
    closeConnection,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    setStreamingQuality,
    setAdaptiveStreaming,
    forceQualityCheck,

    // Events
    onDataChannelMessage,

    // Error handling
    error: errorHandler.error?.userMessage || null,
    clearError,
  };
}