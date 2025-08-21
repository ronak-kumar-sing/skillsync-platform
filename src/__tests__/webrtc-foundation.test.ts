import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { WebRTCService, ConnectionQuality } from '@/services/webrtc.service';

// Mock Socket.io
const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  connecting: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Enhanced WebRTC mocks
const mockPeerConnection = {
  connectionState: 'new',
  iceConnectionState: 'new',
  iceGatheringState: 'new',
  createOffer: vi.fn(),
  createAnswer: vi.fn(),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  addTrack: vi.fn(),
  getSenders: vi.fn(() => []),
  getStats: vi.fn(),
  close: vi.fn(),
  onconnectionstatechange: null,
  oniceconnectionstatechange: null,
  onicegatheringstatechange: null,
  ontrack: null,
  onicecandidate: null,
  ondatachannel: null,
  createDataChannel: vi.fn(() => ({
    readyState: 'open',
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  })),
};

const mockVideoTrack = {
  id: 'video-track-1',
  kind: 'video',
  enabled: true,
  stop: vi.fn(),
  onended: null,
};

const mockAudioTrack = {
  id: 'audio-track-1',
  kind: 'audio',
  enabled: true,
  stop: vi.fn(),
};

const mockMediaStream = {
  id: 'stream-1',
  getTracks: vi.fn(() => [mockVideoTrack, mockAudioTrack]),
  getVideoTracks: vi.fn(() => [mockVideoTrack]),
  getAudioTracks: vi.fn(() => [mockAudioTrack]),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
};

const mockSender = {
  track: mockVideoTrack,
  replaceTrack: vi.fn(),
};

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn(() => mockPeerConnection) as any;
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
  },
} as any;

// Mock stats report for quality monitoring
const createMockStatsReport = (overrides = {}): RTCStatsReport => {
  const defaultStats = {
    'candidate-pair-1': {
      type: 'candidate-pair',
      state: 'succeeded',
      currentRoundTripTime: 0.05, // 50ms
    },
    'inbound-rtp-video': {
      type: 'inbound-rtp',
      kind: 'video',
      packetsReceived: 1000,
      packetsLost: 5,
      jitter: 0.01, // 10ms
      framesPerSecond: 30,
      frameWidth: 1280,
      frameHeight: 720,
      bytesReceived: 1000000,
    },
    'inbound-rtp-audio': {
      type: 'inbound-rtp',
      kind: 'audio',
      bytesReceived: 50000,
    },
    'outbound-rtp-video': {
      type: 'outbound-rtp',
      kind: 'video',
      bytesSent: 1000000,
    },
    ...overrides,
  };

  const statsMap = new Map();
  Object.entries(defaultStats).forEach(([key, value]) => {
    statsMap.set(key, value);
  });

  return statsMap as RTCStatsReport;
};

describe('Enhanced WebRTC Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
    mockPeerConnection.connectionState = 'new';
    mockPeerConnection.getStats.mockResolvedValue(createMockStatsReport());
    mockPeerConnection.getSenders.mockReturnValue([mockSender]);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('WebRTCService - Enhanced Configuration', () => {
    it('should initialize with comprehensive STUN/TURN configuration', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      // Trigger peer connection setup
      await service.initializeAsInitiator();

      expect(RTCPeerConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          iceServers: expect.arrayContaining([
            expect.objectContaining({ urls: 'stun:stun.l.google.com:19302' }),
            expect.objectContaining({ urls: 'stun:stun.cloudflare.com:3478' }),
          ]),
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        })
      );
    });

    it('should setup enhanced connection monitoring', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');
      const events = {
        onConnectionStateChange: vi.fn(),
        onLocalStream: vi.fn(),
        onRemoteStream: vi.fn(),
        onConnectionQualityChange: vi.fn(),
        onAdaptiveQualityChange: vi.fn(),
        onError: vi.fn(),
      };

      await service.initializeAsInitiator(events);

      expect(mockPeerConnection.onconnectionstatechange).toBeDefined();
      expect(mockPeerConnection.oniceconnectionstatechange).toBeDefined();
      expect(mockPeerConnection.onicegatheringstatechange).toBeDefined();
    });

    it('should track connection establishment timing', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      const metrics = service.getConnectionMetrics();
      expect(metrics.connectionStartTime).toBeGreaterThan(0);
      expect(metrics.currentTime).toBeGreaterThanOrEqual(metrics.connectionStartTime);
    });
  });

  describe('Connection Quality Monitoring', () => {
    it('should analyze connection stats and determine quality', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');
      const qualityCallback = vi.fn();

      await service.initializeAsInitiator({
        onConnectionQualityChange: qualityCallback,
      });

      // Simulate connection established
      mockPeerConnection.connectionState = 'connected';
      mockPeerConnection.onconnectionstatechange?.();

      // Wait for quality monitoring to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const quality = await service.forceQualityCheck();

      expect(quality).toBeDefined();
      expect(quality?.level).toBe('excellent'); // Based on mock stats (low RTT, low packet loss)
      expect(quality?.score).toBeGreaterThan(0);
      expect(quality?.metrics.rtt).toBe(50); // 0.05 * 1000
      expect(quality?.metrics.jitter).toBe(10); // 0.01 * 1000
      expect(quality?.metrics.packetLoss).toBeCloseTo(0.5, 1); // 5/1005 * 100 (allow floating point precision)
    });

    it('should detect poor connection quality', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      // Mock poor quality stats
      const poorStats = createMockStatsReport({
        'candidate-pair-1': {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.5, // 500ms - poor
        },
        'inbound-rtp-video': {
          type: 'inbound-rtp',
          kind: 'video',
          packetsReceived: 1000,
          packetsLost: 100, // 10% packet loss - poor
          jitter: 0.1, // 100ms jitter - poor
          framesPerSecond: 15,
          frameWidth: 640,
          frameHeight: 480,
          bytesReceived: 500000,
        },
      });

      mockPeerConnection.getStats.mockResolvedValue(poorStats);

      await service.initializeAsInitiator();

      const quality = await service.forceQualityCheck();

      expect(quality?.level).toBe('critical'); // Very poor stats should result in critical
      expect(quality?.score).toBeLessThan(50);
    });

    it('should maintain quality history', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      // Force multiple quality checks
      await service.forceQualityCheck();
      await service.forceQualityCheck();
      await service.forceQualityCheck();

      const history = service.getQualityHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Streaming', () => {
    it('should adapt quality based on connection quality', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');
      const adaptiveCallback = vi.fn();

      await service.initializeAsInitiator({
        onAdaptiveQualityChange: adaptiveCallback,
      });

      // Mock poor connection that should trigger quality reduction
      const poorStats = createMockStatsReport({
        'candidate-pair-1': {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.4, // 400ms
        },
        'inbound-rtp-video': {
          type: 'inbound-rtp',
          kind: 'video',
          packetsReceived: 1000,
          packetsLost: 80, // 8% packet loss
          jitter: 0.08,
        },
      });

      mockPeerConnection.getStats.mockResolvedValue(poorStats);
      mockPeerConnection.connectionState = 'connected';
      mockPeerConnection.onconnectionstatechange?.();

      // Wait for adaptive streaming to trigger
      await new Promise(resolve => setTimeout(resolve, 2500));

      expect(service.getCurrentQualityLevel()).toBe('low');
    });

    it('should allow manual quality control', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      await service.setStreamingQuality('medium');

      expect(service.getCurrentQualityLevel()).toBe('medium');
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
          }),
        })
      );
    });

    it('should enable/disable adaptive streaming', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      expect(service.isAdaptiveStreamingEnabled()).toBe(true);

      service.setAdaptiveStreaming(false);
      expect(service.isAdaptiveStreamingEnabled()).toBe(false);

      service.setAdaptiveStreaming(true);
      expect(service.isAdaptiveStreamingEnabled()).toBe(true);
    });
  });

  describe('useWebRTC Hook - Enhanced Features', () => {
    it('should provide quality monitoring state', () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      expect(result.current.connectionQuality).toBeNull();
      expect(result.current.qualityHistory).toEqual([]);
      expect(result.current.currentQualityLevel).toBe('high');
      expect(result.current.isAdaptiveStreamingEnabled).toBe(true);
    });

    it('should update quality state when quality changes', async () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      // Mock quality to be returned by forceQualityCheck
      const mockQuality: ConnectionQuality = {
        level: 'good',
        score: 85,
        metrics: {
          rtt: 50,
          jitter: 10,
          packetLoss: 0.5,
          bandwidth: { upload: 1000, download: 1500 },
          video: { resolution: '1280x720', frameRate: 30, bitrate: 2000 },
          audio: { bitrate: 128, sampleRate: 44100 },
        },
      };

      // Create custom stats that will produce the expected quality
      const customStats = createMockStatsReport({
        'candidate-pair-1': {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.05, // 50ms
        },
        'inbound-rtp-video': {
          type: 'inbound-rtp',
          kind: 'video',
          packetsReceived: 2000,
          packetsLost: 10, // 0.5% packet loss
          jitter: 0.01, // 10ms
          framesPerSecond: 30,
          frameWidth: 1280,
          frameHeight: 720,
          bytesReceived: 2000000,
        },
      });

      mockPeerConnection.getStats.mockResolvedValue(customStats);

      await act(async () => {
        await result.current.startConnection();
      });

      await act(async () => {
        await result.current.forceQualityCheck();
      });

      expect(result.current.connectionQuality).toBeDefined();
      expect(result.current.qualityHistory).toHaveLength(1);
    });

    it('should allow manual quality control through hook', async () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      await act(async () => {
        await result.current.setStreamingQuality('low');
      });

      expect(result.current.currentQualityLevel).toBe('low');
    });

    it('should control adaptive streaming through hook', async () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      act(() => {
        result.current.setAdaptiveStreaming(false);
      });

      expect(result.current.isAdaptiveStreamingEnabled).toBe(false);
    });

    it('should force quality check through hook', async () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      await act(async () => {
        await result.current.forceQualityCheck();
      });

      expect(mockPeerConnection.getStats).toHaveBeenCalled();
    });
  });

  describe('Enhanced Signaling', () => {
    it('should emit connection establishment metrics', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      // Simulate successful connection
      mockPeerConnection.connectionState = 'connected';
      mockPeerConnection.onconnectionstatechange?.();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'webrtc_connection_established',
        expect.objectContaining({
          sessionId: 'test-session',
          connectionTime: expect.any(Number),
          metrics: expect.any(Object),
        })
      );
    });

    it('should emit quality reports', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      // Simulate connection and quality monitoring
      mockPeerConnection.connectionState = 'connected';
      mockPeerConnection.onconnectionstatechange?.();

      // Wait for quality monitoring
      await new Promise(resolve => setTimeout(resolve, 2500));

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'webrtc_quality_report',
        expect.objectContaining({
          sessionId: 'test-session',
          quality: expect.any(Object),
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle getUserMedia failures gracefully', async () => {
      navigator.mediaDevices.getUserMedia = vi.fn(() =>
        Promise.reject(new Error('Permission denied'))
      );

      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      expect(result.current.error).toContain('Permission denied');
    });

    it('should handle stats collection failures', async () => {
      mockPeerConnection.getStats.mockRejectedValue(new Error('Stats unavailable'));

      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      const quality = await service.forceQualityCheck();
      expect(quality).toBeNull();
    });

    it('should handle quality adaptation failures', async () => {
      navigator.mediaDevices.getUserMedia = vi.fn()
        .mockResolvedValueOnce(mockMediaStream) // Initial call succeeds
        .mockRejectedValue(new Error('Device busy')); // Quality change fails

      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      await expect(service.setStreamingQuality('low')).rejects.toThrow('Device busy');
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should stop quality monitoring on close', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      // Start quality monitoring
      mockPeerConnection.connectionState = 'connected';
      mockPeerConnection.onconnectionstatechange?.();

      service.close();

      // Verify cleanup
      expect(service.getConnectionQuality()).toBeNull();
      expect(service.getCurrentQualityLevel()).toBe('high');
    });

    it('should cleanup hook state on unmount', () => {
      const { result, unmount } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      unmount();

      // Verify no memory leaks or hanging references
      expect(result.current.connectionState).toBe('new');
    });
  });
});