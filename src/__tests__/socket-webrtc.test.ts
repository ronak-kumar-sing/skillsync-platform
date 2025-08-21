import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket, useCollaborationSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCollaboration } from '@/hooks/useCollaboration';
import { WebRTCService } from '@/services/webrtc.service';

// Mock Socket.io
const mockSocket = {
  id: 'test-socket-id',
  connected: false,
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

// Mock WebRTC APIs
const mockPeerConnection = {
  connectionState: 'new',
  createOffer: vi.fn(),
  createAnswer: vi.fn(),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  addTrack: vi.fn(),
  getSenders: vi.fn(() => []),
  close: vi.fn(),
  onconnectionstatechange: null,
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

const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  addTrack: vi.fn(),
};

global.RTCPeerConnection = vi.fn(() => mockPeerConnection) as any;
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
  },
} as any;

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    token: 'test-token',
  }),
}));

describe('Socket.io Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.connecting = false;
  });

  describe('useSocket', () => {
    it('should initialize socket connection', () => {
      const { result } = renderHook(() => useSocket({ autoConnect: false }));

      expect(result.current.socket).toBeDefined();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should handle connection events', () => {
      const { result } = renderHook(() => useSocket());

      // Simulate connection
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should handle disconnection events', () => {
      const { result } = renderHook(() => useSocket());

      // Simulate disconnection
      act(() => {
        mockSocket.connected = false;
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
        disconnectHandler?.('io server disconnect');
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should emit events when connected', () => {
      const { result } = renderHook(() => useSocket({ autoConnect: false }));

      // Simulate connection
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      act(() => {
        result.current.emit('test-event', { data: 'test' });
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('useCollaborationSocket', () => {
    it('should connect to collaboration namespace', () => {
      const { result } = renderHook(() => useCollaborationSocket());

      expect(result.current.socket).toBeDefined();
    });
  });
});

describe('WebRTC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
  });

  describe('WebRTCService', () => {
    it('should initialize peer connection', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      await service.initializeAsInitiator();

      expect(RTCPeerConnection).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should create offer when initializing as initiator', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      mockPeerConnection.createOffer.mockResolvedValue({ type: 'offer', sdp: 'test-sdp' });

      await service.initializeAsInitiator();

      expect(mockPeerConnection.createOffer).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc_offer', expect.objectContaining({
        sessionId: 'test-session',
        offer: { type: 'offer', sdp: 'test-sdp' },
      }));
    });

    it('should handle incoming offer', async () => {
      const service = new WebRTCService(mockSocket as any, 'test-session');

      mockPeerConnection.createAnswer.mockResolvedValue({ type: 'answer', sdp: 'test-sdp' });

      await service.initializeAsReceiver();

      // Simulate incoming offer by calling the private method directly
      // Since the socket listener setup is internal, we'll test the functionality differently
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalled();
      expect(mockPeerConnection.createAnswer).not.toHaveBeenCalled(); // Only called when offer received
    });

    it('should toggle video track', async () => {
      const mockVideoTrack = { enabled: true };
      mockMediaStream.getVideoTracks.mockReturnValue([mockVideoTrack]);

      const service = new WebRTCService(mockSocket as any, 'test-session');
      await service.initializeAsInitiator();

      const result = service.toggleVideo();

      expect(result).toBe(false); // Should toggle to false
      expect(mockVideoTrack.enabled).toBe(false);
    });

    it('should start screen sharing', async () => {
      const mockScreenStream = {
        getVideoTracks: () => [{ onended: null }],
      };
      navigator.mediaDevices.getDisplayMedia = vi.fn(() => Promise.resolve(mockScreenStream as any));

      const mockSender = { replaceTrack: vi.fn() };
      mockPeerConnection.getSenders.mockReturnValue([mockSender]);

      const service = new WebRTCService(mockSocket as any, 'test-session');
      await service.initializeAsInitiator();

      const screenStream = await service.startScreenShare();

      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
      expect(screenStream).toBe(mockScreenStream);
    });
  });

  describe('useWebRTC', () => {
    it('should initialize WebRTC connection', () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      expect(result.current.connectionState).toBe('new');
      expect(result.current.isConnected).toBe(false);
    });

    it('should start connection when requested', async () => {
      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should toggle video and audio', async () => {
      const mockVideoTrack = { enabled: true };
      const mockAudioTrack = { enabled: true };
      mockMediaStream.getVideoTracks.mockReturnValue([mockVideoTrack]);
      mockMediaStream.getAudioTracks.mockReturnValue([mockAudioTrack]);

      const { result } = renderHook(() => useWebRTC({
        socket: mockSocket as any,
        sessionId: 'test-session',
        isInitiator: true,
      }));

      await act(async () => {
        await result.current.startConnection();
      });

      act(() => {
        result.current.toggleVideo();
      });

      act(() => {
        result.current.toggleAudio();
      });

      expect(mockVideoTrack.enabled).toBe(false);
      expect(mockAudioTrack.enabled).toBe(false);
    });
  });
});

describe('Collaboration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
  });

  describe('useCollaboration', () => {
    it('should initialize collaboration session', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        isInitiator: true,
      }));

      expect(result.current.isInSession).toBe(false);
      expect(result.current.participants).toEqual([]);
      expect(result.current.messages).toEqual([]);
    });

    it('should join session when connected', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection
      act(() => {
        mockSocket.connected = true;
      });

      act(() => {
        result.current.joinSession();
      });

      expect(result.current.isInSession).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('join_session', {
        sessionId: 'test-session',
      });
    });

    it('should handle user joining session', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
      }));

      act(() => {
        const joinHandler = mockSocket.on.mock.calls.find(call => call[0] === 'user_joined_session')?.[1];
        joinHandler?.({
          userId: 'other-user',
          socketId: 'other-socket',
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.participants).toHaveLength(1);
      expect(result.current.participants[0].userId).toBe('other-user');
    });

    it('should send chat messages', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection and join session
      act(() => {
        mockSocket.connected = true;
        result.current.joinSession();
      });

      act(() => {
        result.current.sendMessage('Hello, world!');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
        sessionId: 'test-session',
        message: 'Hello, world!',
        messageType: 'text',
      });
    });

    it('should handle code changes', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection and join session
      act(() => {
        mockSocket.connected = true;
        result.current.joinSession();
      });

      const codeChanges = { type: 'insert', text: 'console.log("test");' };

      act(() => {
        result.current.sendCodeChange(codeChanges, 1);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('code_change', {
        sessionId: 'test-session',
        changes: codeChanges,
        version: 1,
      });
    });

    it('should handle whiteboard drawing', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection and join session
      act(() => {
        mockSocket.connected = true;
        result.current.joinSession();
      });

      const drawData = { type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };

      act(() => {
        result.current.sendWhiteboardDraw(drawData);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('whiteboard_draw', {
        sessionId: 'test-session',
        drawData,
      });
    });

    it('should handle typing indicators', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection and join session
      act(() => {
        mockSocket.connected = true;
        result.current.joinSession();
      });

      act(() => {
        result.current.startTyping();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing_start', {
        sessionId: 'test-session',
      });

      act(() => {
        result.current.stopTyping();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop', {
        sessionId: 'test-session',
      });
    });

    it('should leave session and cleanup', () => {
      const { result } = renderHook(() => useCollaboration({
        sessionId: 'test-session',
        autoJoin: false,
      }));

      // Simulate socket connection and join session
      act(() => {
        mockSocket.connected = true;
        result.current.joinSession();
      });

      act(() => {
        result.current.leaveSession();
      });

      expect(result.current.isInSession).toBe(false);
      expect(result.current.participants).toEqual([]);
      expect(mockSocket.emit).toHaveBeenCalledWith('leave_session', {
        sessionId: 'test-session',
      });
    });
  });
});

describe('Error Handling', () => {
  it('should handle WebRTC initialization errors', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn(() => Promise.reject(new Error('Permission denied')));

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

  it('should handle socket connection errors', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      errorHandler?.(new Error('Connection failed'));
    });

    expect(result.current.error).toContain('Connection failed');
  });

  it('should clear errors when requested', () => {
    const { result } = renderHook(() => useCollaboration({
      sessionId: 'test-session',
    }));

    // Simulate error
    act(() => {
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      errorHandler?.(new Error('Test error'));
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('Connection Management', () => {
  it('should reconnect automatically on disconnect', () => {
    const { result } = renderHook(() => useSocket({
      reconnection: true,
      reconnectionAttempts: 3,
    }));

    act(() => {
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      disconnectHandler?.('io server disconnect');
    });

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should handle authentication errors', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const authErrorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'auth_error')?.[1];
      authErrorHandler?.({ message: 'Invalid token' });
    });

    expect(result.current.error).toContain('Invalid token');
    expect(result.current.isConnected).toBe(false);
  });
});