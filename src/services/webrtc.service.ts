import { Socket } from 'socket.io-client';

// Enhanced WebRTC configuration with comprehensive STUN/TURN setup
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // Additional public STUN servers for redundancy
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.nextcloud.com:443' },

    // TURN servers for production (NAT traversal)
    ...(process.env.NODE_ENV === 'production' ? [
      {
        urls: [
          process.env.NEXT_PUBLIC_TURN_SERVER_URL || 'turn:turn.skillsync.com:3478',
          process.env.NEXT_PUBLIC_TURNS_SERVER_URL || 'turns:turn.skillsync.com:5349'
        ],
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
      }
    ] : [
      // Development TURN server fallback
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    ])
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Use both STUN and TURN
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// Adaptive media constraints based on connection quality
const MEDIA_CONSTRAINTS = {
  high: {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
    },
  },
  medium: {
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 22050,
    },
  },
  low: {
    video: {
      width: { ideal: 320, max: 640 },
      height: { ideal: 240, max: 480 },
      frameRate: { ideal: 15, max: 24 },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
    },
  },
} as const;

type QualityLevel = keyof typeof MEDIA_CONSTRAINTS;
const DEFAULT_MEDIA_CONSTRAINTS = MEDIA_CONSTRAINTS.high;

// Connection states
export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

// Connection quality metrics
export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100
  metrics: {
    rtt: number; // Round trip time in ms
    jitter: number; // Jitter in ms
    packetLoss: number; // Packet loss percentage
    bandwidth: {
      upload: number; // Kbps
      download: number; // Kbps
    };
    video: {
      resolution: string;
      frameRate: number;
      bitrate: number;
    };
    audio: {
      bitrate: number;
      sampleRate: number;
    };
  };
}

// WebRTC events
export interface WebRTCEvents {
  onConnectionStateChange: (state: ConnectionState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
  onDataChannelMessage: (message: any) => void;
  onConnectionQualityChange: (quality: ConnectionQuality) => void;
  onAdaptiveQualityChange: (newLevel: QualityLevel) => void;
  onError: (error: Error) => void;
}

/**
 * Enhanced WebRTC Connection Manager with Quality Monitoring and Adaptive Streaming
 */
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private isInitiator = false;
  private events: Partial<WebRTCEvents> = {};

  // Quality monitoring
  private qualityMonitorInterval: NodeJS.Timeout | null = null;
  private currentQualityLevel: QualityLevel = 'high';
  private lastQualityCheck = 0;
  private qualityHistory: ConnectionQuality[] = [];
  private adaptiveStreamingEnabled = true;

  // Connection establishment tracking
  private connectionStartTime = 0;
  private iceGatheringStartTime = 0;
  private firstMediaReceived = false;

  constructor(socket: Socket, sessionId: string) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.setupSocketListeners();
  }

  /**
   * Initialize WebRTC connection as initiator
   */
  async initializeAsInitiator(events: Partial<WebRTCEvents> = {}): Promise<void> {
    this.events = events;
    this.isInitiator = true;

    try {
      await this.setupPeerConnection();
      await this.setupLocalMedia();
      await this.createOffer();
    } catch (error) {
      this.handleError(new Error(`Failed to initialize as initiator: ${error}`));
    }
  }

  /**
   * Initialize WebRTC connection as receiver
   */
  async initializeAsReceiver(events: Partial<WebRTCEvents> = {}): Promise<void> {
    this.events = events;
    this.isInitiator = false;

    try {
      await this.setupPeerConnection();
      await this.setupLocalMedia();
    } catch (error) {
      this.handleError(new Error(`Failed to initialize as receiver: ${error}`));
    }
  }

  /**
   * Setup peer connection with enhanced monitoring
   */
  private async setupPeerConnection(): Promise<void> {
    this.connectionStartTime = Date.now();
    this.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

    // Enhanced connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState as ConnectionState;
      const connectionTime = Date.now() - this.connectionStartTime;

      console.log(`WebRTC connection state: ${state} (${connectionTime}ms)`);
      this.events.onConnectionStateChange?.(state);

      if (state === 'connected') {
        this.startQualityMonitoring();
        console.log(`WebRTC connection established in ${connectionTime}ms`);

        // Emit connection establishment event
        if (this.socket && this.sessionId) {
          this.socket.emit('webrtc_connection_established', {
            sessionId: this.sessionId,
            connectionTime,
            metrics: this.getConnectionMetrics(),
          });
        }
      } else if (state === 'disconnected' || state === 'failed') {
        this.stopQualityMonitoring();

        // Emit connection failure event
        if (this.socket && this.sessionId && state === 'failed') {
          this.socket.emit('webrtc_connection_failed', {
            sessionId: this.sessionId,
            error: 'Connection failed',
            metrics: this.getConnectionMetrics(),
          });
        }
      }
    };

    // ICE connection state monitoring
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state:', iceState);

      if (iceState === 'connected' || iceState === 'completed') {
        const iceTime = Date.now() - this.iceGatheringStartTime;
        console.log(`ICE connection established in ${iceTime}ms`);
      }
    };

    // ICE gathering state monitoring
    this.peerConnection.onicegatheringstatechange = () => {
      const gatheringState = this.peerConnection?.iceGatheringState;
      console.log('ICE gathering state:', gatheringState);

      if (gatheringState === 'gathering') {
        this.iceGatheringStartTime = Date.now();
      }
    };

    // Enhanced remote stream handling
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, event.track.id);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      this.remoteStream.addTrack(event.track);

      // Track first media received for connection timing
      if (!this.firstMediaReceived) {
        this.firstMediaReceived = true;
        const mediaTime = Date.now() - this.connectionStartTime;
        console.log(`First media received in ${mediaTime}ms`);
      }

      this.events.onRemoteStream?.(this.remoteStream);
    };

    // Enhanced ICE candidate handling with logging
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.sessionId) {
        console.log('Sending ICE candidate:', event.candidate.type, event.candidate.protocol);

        this.socket.emit('webrtc_ice_candidate', {
          sessionId: this.sessionId,
          candidate: event.candidate,
        });
      } else if (!event.candidate) {
        console.log('ICE gathering completed');
      }
    };

    // Setup data channel for text chat and file sharing
    if (this.isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('chat', {
        ordered: true,
        maxRetransmits: 3,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  /**
   * Setup data channel for messaging
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.events.onDataChannelMessage?.(message);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  /**
   * Setup local media (camera and microphone)
   */
  private async setupLocalMedia(constraints: MediaStreamConstraints = DEFAULT_MEDIA_CONSTRAINTS): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      this.events.onLocalStream?.(this.localStream);
      console.log('Local media setup complete');
    } catch (error) {
      this.handleError(new Error(`Failed to access media devices: ${error}`));
    }
  }

  /**
   * Create and send offer
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection || !this.socket || !this.sessionId) return;

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc_offer', {
        sessionId: this.sessionId,
        offer,
      });

      console.log('Offer created and sent');
    } catch (error) {
      this.handleError(new Error(`Failed to create offer: ${error}`));
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection || !this.socket || !this.sessionId) return;

    try {
      await this.peerConnection.setRemoteDescription(offer);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc_answer', {
        sessionId: this.sessionId,
        answer,
      });

      console.log('Answer created and sent');
    } catch (error) {
      this.handleError(new Error(`Failed to handle offer: ${error}`));
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log('Answer received and processed');
    } catch (error) {
      this.handleError(new Error(`Failed to handle answer: ${error}`));
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('ICE candidate added');
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  /**
   * Setup socket listeners for WebRTC signaling
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('webrtc_offer', (data) => {
      if (data.sessionId === this.sessionId) {
        this.handleOffer(data.offer);
      }
    });

    this.socket.on('webrtc_answer', (data) => {
      if (data.sessionId === this.sessionId) {
        this.handleAnswer(data.answer);
      }
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      if (data.sessionId === this.sessionId) {
        this.handleIceCandidate(data.candidate);
      }
    });
  }

  /**
   * Send message through data channel
   */
  sendMessage(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Data channel not available for sending message');
    }
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track with screen share
      if (this.peerConnection && this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const screenTrack = screenStream.getVideoTracks()[0];

        if (videoTrack && screenTrack) {
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          );

          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Handle screen share end
        screenTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      return screenStream;
    } catch (error) {
      this.handleError(new Error(`Failed to start screen share: ${error}`));
      return null;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.peerConnection || !this.localStream) return;

    try {
      // Get original video track
      const videoTrack = this.localStream.getVideoTracks()[0];

      if (videoTrack) {
        const sender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) return null;

    try {
      return await this.peerConnection.getStats();
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return null;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('WebRTC Error:', error);
    this.events.onError?.(error);
  }

  /**
   * Start connection quality monitoring
   */
  private startQualityMonitoring(): void {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
    }

    this.qualityMonitorInterval = setInterval(async () => {
      await this.checkConnectionQuality();
    }, 2000); // Check every 2 seconds

    console.log('Connection quality monitoring started');
  }

  /**
   * Stop connection quality monitoring
   */
  private stopQualityMonitoring(): void {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
      this.qualityMonitorInterval = null;
    }
    console.log('Connection quality monitoring stopped');
  }

  /**
   * Check connection quality and adapt streaming if needed
   */
  private async checkConnectionQuality(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const quality = this.analyzeConnectionStats(stats);

      // Store quality history (keep last 10 measurements)
      this.qualityHistory.push(quality);
      if (this.qualityHistory.length > 10) {
        this.qualityHistory.shift();
      }

      this.events.onConnectionQualityChange?.(quality);

      // Emit quality report via socket
      if (this.socket && this.sessionId) {
        this.socket.emit('webrtc_quality_report', {
          sessionId: this.sessionId,
          quality,
        });
      }

      // Adaptive streaming based on quality
      if (this.adaptiveStreamingEnabled) {
        await this.adaptStreamingQuality(quality);
      }

      this.lastQualityCheck = Date.now();
    } catch (error) {
      console.error('Failed to check connection quality:', error);
    }
  }

  /**
   * Analyze WebRTC stats to determine connection quality
   */
  private analyzeConnectionStats(stats: RTCStatsReport): ConnectionQuality {
    let rtt = 0;
    let jitter = 0;
    let packetLoss = 0;
    let uploadBandwidth = 0;
    let downloadBandwidth = 0;
    let videoResolution = '';
    let videoFrameRate = 0;
    let videoBitrate = 0;
    let audioBitrate = 0;
    let audioSampleRate = 0;

    stats.forEach((report) => {
      switch (report.type) {
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            rtt = report.currentRoundTripTime * 1000 || 0;
          }
          break;

        case 'inbound-rtp':
          if (report.kind === 'video') {
            packetLoss = (report.packetsLost / (report.packetsReceived + report.packetsLost)) * 100 || 0;
            jitter = report.jitter * 1000 || 0;
            videoFrameRate = report.framesPerSecond || 0;
            videoBitrate = report.bytesReceived ? (report.bytesReceived * 8) / 1000 : 0;

            if (report.frameWidth && report.frameHeight) {
              videoResolution = `${report.frameWidth}x${report.frameHeight}`;
            }
          } else if (report.kind === 'audio') {
            audioBitrate = report.bytesReceived ? (report.bytesReceived * 8) / 1000 : 0;
          }
          break;

        case 'outbound-rtp':
          if (report.kind === 'video') {
            uploadBandwidth = report.bytesSent ? (report.bytesSent * 8) / 1000 : 0;
          }
          break;

        case 'media-source':
          if (report.kind === 'audio') {
            audioSampleRate = report.audioLevel || 0;
          }
          break;
      }
    });

    // Calculate overall quality score (0-100)
    let score = 100;

    // RTT impact (0-50ms = excellent, 50-150ms = good, 150-300ms = fair, >300ms = poor)
    if (rtt > 300) score -= 40;
    else if (rtt > 150) score -= 25;
    else if (rtt > 50) score -= 10;

    // Packet loss impact
    if (packetLoss > 5) score -= 30;
    else if (packetLoss > 2) score -= 15;
    else if (packetLoss > 0.5) score -= 5;

    // Jitter impact
    if (jitter > 50) score -= 20;
    else if (jitter > 20) score -= 10;
    else if (jitter > 10) score -= 5;

    // Determine quality level
    let level: ConnectionQuality['level'];
    if (score >= 90) level = 'excellent';
    else if (score >= 75) level = 'good';
    else if (score >= 60) level = 'fair';
    else if (score >= 40) level = 'poor';
    else level = 'critical';

    return {
      level,
      score: Math.max(0, Math.min(100, score)),
      metrics: {
        rtt,
        jitter,
        packetLoss,
        bandwidth: {
          upload: uploadBandwidth,
          download: downloadBandwidth,
        },
        video: {
          resolution: videoResolution,
          frameRate: videoFrameRate,
          bitrate: videoBitrate,
        },
        audio: {
          bitrate: audioBitrate,
          sampleRate: audioSampleRate,
        },
      },
    };
  }

  /**
   * Adapt streaming quality based on connection quality
   */
  private async adaptStreamingQuality(quality: ConnectionQuality): Promise<void> {
    let targetQuality: QualityLevel = this.currentQualityLevel;

    // Determine target quality based on connection quality
    switch (quality.level) {
      case 'excellent':
      case 'good':
        targetQuality = 'high';
        break;
      case 'fair':
        targetQuality = 'medium';
        break;
      case 'poor':
      case 'critical':
        targetQuality = 'low';
        break;
    }

    // Only adapt if quality level needs to change
    if (targetQuality !== this.currentQualityLevel) {
      console.log(`Adapting quality from ${this.currentQualityLevel} to ${targetQuality}`);

      try {
        await this.changeStreamingQuality(targetQuality);
        this.currentQualityLevel = targetQuality;
        this.events.onAdaptiveQualityChange?.(targetQuality);
      } catch (error) {
        console.error('Failed to adapt streaming quality:', error);
      }
    }
  }

  /**
   * Change streaming quality by updating media constraints
   */
  private async changeStreamingQuality(quality: QualityLevel): Promise<void> {
    if (!this.peerConnection || !this.localStream) return;

    const constraints = MEDIA_CONSTRAINTS[quality];

    try {
      // Get new media stream with updated constraints
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Replace video track
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];

      if (videoTrack) {
        const videoSender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);

          // Update local stream
          const oldVideoTrack = this.localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            this.localStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          this.localStream.addTrack(videoTrack);
        }
      }

      if (audioTrack) {
        const audioSender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'audio'
        );

        if (audioSender) {
          await audioSender.replaceTrack(audioTrack);

          // Update local stream
          const oldAudioTrack = this.localStream.getAudioTracks()[0];
          if (oldAudioTrack) {
            this.localStream.removeTrack(oldAudioTrack);
            oldAudioTrack.stop();
          }
          this.localStream.addTrack(audioTrack);
        }
      }

      console.log(`Stream quality changed to ${quality}`);
    } catch (error) {
      console.error('Failed to change streaming quality:', error);
      throw error;
    }
  }

  /**
   * Get current connection quality
   */
  getConnectionQuality(): ConnectionQuality | null {
    return this.qualityHistory.length > 0
      ? this.qualityHistory[this.qualityHistory.length - 1]
      : null;
  }

  /**
   * Get quality history
   */
  getQualityHistory(): ConnectionQuality[] {
    return [...this.qualityHistory];
  }

  /**
   * Enable or disable adaptive streaming
   */
  setAdaptiveStreaming(enabled: boolean): void {
    this.adaptiveStreamingEnabled = enabled;
    console.log(`Adaptive streaming ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Manually set streaming quality
   */
  async setStreamingQuality(quality: QualityLevel): Promise<void> {
    if (quality !== this.currentQualityLevel) {
      await this.changeStreamingQuality(quality);
      this.currentQualityLevel = quality;
      console.log(`Manual quality change to ${quality}`);
    }
  }

  /**
   * Close connection and cleanup
   */
  close(): void {
    // Stop quality monitoring
    this.stopQualityMonitoring();

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Remove socket listeners
    if (this.socket) {
      this.socket.off('webrtc_offer');
      this.socket.off('webrtc_answer');
      this.socket.off('webrtc_ice_candidate');
    }

    // Reset state
    this.qualityHistory = [];
    this.currentQualityLevel = 'high';
    this.firstMediaReceived = false;

    console.log('WebRTC connection closed and cleaned up');
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return (this.peerConnection?.connectionState as ConnectionState) || 'new';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.getConnectionState() === 'connected';
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get current streaming quality level
   */
  getCurrentQualityLevel(): QualityLevel {
    return this.currentQualityLevel;
  }

  /**
   * Check if adaptive streaming is enabled
   */
  isAdaptiveStreamingEnabled(): boolean {
    return this.adaptiveStreamingEnabled;
  }

  /**
   * Get connection establishment metrics
   */
  getConnectionMetrics() {
    return {
      connectionStartTime: this.connectionStartTime,
      iceGatheringStartTime: this.iceGatheringStartTime,
      firstMediaReceived: this.firstMediaReceived,
      currentTime: Date.now(),
    };
  }

  /**
   * Force connection quality check
   */
  async forceQualityCheck(): Promise<ConnectionQuality | null> {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      const quality = this.analyzeConnectionStats(stats);

      // Add to history like the regular monitoring does
      this.qualityHistory.push(quality);
      if (this.qualityHistory.length > 10) {
        this.qualityHistory.shift();
      }

      return quality;
    } catch (error) {
      console.error('Failed to force quality check:', error);
      return null;
    }
  }
}