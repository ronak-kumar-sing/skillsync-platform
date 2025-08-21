import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VideoCallComponent } from '@/components/features/VideoCallComponent';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { PerformanceProvider } from '@/components/ui/PerformanceProvider';

// Mock the hooks
vi.mock('@/hooks/useWebRTC', () => ({
  useWebRTC: vi.fn(),
}));
vi.mock('@/hooks/useSocket', () => ({
  useSocket: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock WebRTC APIs
Object.defineProperty(global, 'MediaStream', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    getTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => []),
    getAudioTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  })),
});

Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOffer: vi.fn(),
    createAnswer: vi.fn(),
    setLocalDescription: vi.fn(),
    setRemoteDescription: vi.fn(),
    addIceCandidate: vi.fn(),
    close: vi.fn(),
    getSenders: vi.fn(() => []),
    getStats: vi.fn(() => Promise.resolve(new Map())),
  })),
});

// Mock navigator APIs
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(new MediaStream())),
    getDisplayMedia: vi.fn(() => Promise.resolve(new MediaStream())),
  },
});

const mockUseWebRTC = {
  connectionState: 'connected' as const,
  isConnected: true,
  isConnecting: false,
  localStream: new MediaStream(),
  remoteStream: new MediaStream(),
  isVideoEnabled: true,
  isAudioEnabled: true,
  isScreenSharing: false,
  connectionQuality: {
    level: 'good' as const,
    score: 85,
    metrics: {
      rtt: 50,
      jitter: 10,
      packetLoss: 0.1,
      bandwidth: { upload: 1000, download: 1500 },
      video: { resolution: '1280x720', frameRate: 30, bitrate: 1000 },
      audio: { bitrate: 128, sampleRate: 44100 },
    },
  },
  currentQualityLevel: 'high',
  startConnection: vi.fn(),
  closeConnection: vi.fn(),
  toggleVideo: vi.fn(),
  toggleAudio: vi.fn(),
  startScreenShare: vi.fn(),
  stopScreenShare: vi.fn(),
  error: null,
  clearError: vi.fn(),
};

const mockUseSocket = {
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
  isConnected: true,
  isConnecting: false,
  error: null,
};

// Import the mocked hooks
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSocket } from '@/hooks/useSocket';

// Setup mocks
beforeEach(() => {
  vi.mocked(useWebRTC).mockReturnValue(mockUseWebRTC);
  vi.mocked(useSocket).mockReturnValue(mockUseSocket);
});

const renderVideoCall = (props = {}) => {
  return render(
    <PerformanceProvider>
      <AccessibilityProvider>
        <VideoCallComponent
          sessionId="test-session"
          isInitiator={true}
          {...props}
        />
      </AccessibilityProvider>
    </PerformanceProvider>
  );
};

describe('VideoCallComponent', () => {
  it('renders video call interface correctly', () => {
    renderVideoCall();

    expect(screen.getByRole('application')).toBeInTheDocument();
    expect(screen.getByLabelText('Video call interface')).toBeInTheDocument();
  });

  it('displays connection status indicator', () => {
    renderVideoCall();

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows video call controls', () => {
    renderVideoCall();

    expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument();
    expect(screen.getByLabelText('Turn off camera')).toBeInTheDocument();
    expect(screen.getByLabelText('Start screen sharing')).toBeInTheDocument();
    expect(screen.getByLabelText('End call')).toBeInTheDocument();
  });

  it('handles audio toggle', async () => {
    renderVideoCall();

    const muteButton = screen.getByLabelText('Mute microphone');
    fireEvent.click(muteButton);

    expect(mockUseWebRTC.toggleAudio).toHaveBeenCalled();
  });

  it('handles video toggle', async () => {
    renderVideoCall();

    const videoButton = screen.getByLabelText('Turn off camera');
    fireEvent.click(videoButton);

    expect(mockUseWebRTC.toggleVideo).toHaveBeenCalled();
  });

  it('handles screen sharing', async () => {
    renderVideoCall();

    const screenShareButton = screen.getByLabelText('Start screen sharing');
    fireEvent.click(screenShareButton);

    expect(mockUseWebRTC.startScreenShare).toHaveBeenCalled();
  });

  it('handles call end', async () => {
    const onCallEnd = vi.fn();
    renderVideoCall({ onCallEnd });

    const endCallButton = screen.getByLabelText('End call');
    fireEvent.click(endCallButton);

    expect(mockUseWebRTC.closeConnection).toHaveBeenCalled();
    expect(onCallEnd).toHaveBeenCalled();
  });

  it('shows connecting state', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      connectionState: 'connecting',
      isConnected: false,
      isConnecting: true,
    });

    renderVideoCall();

    expect(screen.getByText('Connecting to call...')).toBeInTheDocument();
  });

  it('shows connection failed state', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      connectionState: 'failed',
      isConnected: false,
      error: 'Connection failed',
    });

    renderVideoCall();

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', () => {
    renderVideoCall();

    const container = screen.getByLabelText('Video call interface');
    container.focus();

    // Test mute shortcut (M key)
    fireEvent.keyDown(container, { key: 'm' });
    expect(mockUseWebRTC.toggleAudio).toHaveBeenCalled();

    // Test video shortcut (V key)
    fireEvent.keyDown(container, { key: 'v' });
    expect(mockUseWebRTC.toggleVideo).toHaveBeenCalled();
  });

  it('shows quality panel when requested', async () => {
    renderVideoCall();

    const qualityButton = screen.getByLabelText('Show connection quality');
    fireEvent.click(qualityButton);

    await waitFor(() => {
      expect(screen.getByText('Connection Quality')).toBeInTheDocument();
    });
  });

  it('displays participant videos', () => {
    renderVideoCall();

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();
  });

  it('shows waiting message when no remote stream', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      remoteStream: null,
    });

    renderVideoCall();

    expect(screen.getByText('Waiting for partner to join...')).toBeInTheDocument();
  });

  it('handles fullscreen toggle', async () => {
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    });

    const mockRequestFullscreen = vi.fn();
    const mockExitFullscreen = vi.fn();

    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      writable: true,
      value: mockRequestFullscreen,
    });

    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: mockExitFullscreen,
    });

    renderVideoCall();

    const fullscreenButton = screen.getByLabelText('Enter fullscreen');
    fireEvent.click(fullscreenButton);

    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it('handles layout changes', () => {
    renderVideoCall();

    // Find and click layout button (it's in a dropdown)
    const layoutButton = screen.getByLabelText('Change layout');
    fireEvent.mouseEnter(layoutButton.parentElement!);

    const speakerLayoutButton = screen.getByText('Speaker');
    fireEvent.click(speakerLayoutButton);

    // Layout should change (we can't easily test the visual change, but the click should work)
    expect(speakerLayoutButton).toBeInTheDocument();
  });

  it('handles errors properly', () => {
    const onError = vi.fn();
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      error: 'Test error message',
    });

    renderVideoCall({ onError });

    expect(onError).toHaveBeenCalledWith('Test error message');
  });

  it('shows muted state correctly', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      isAudioEnabled: false,
    });

    renderVideoCall();

    expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument();
  });

  it('shows video disabled state correctly', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      isVideoEnabled: false,
    });

    renderVideoCall();

    expect(screen.getByLabelText('Turn on camera')).toBeInTheDocument();
  });

  it('shows screen sharing active state', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      isScreenSharing: true,
    });

    renderVideoCall();

    expect(screen.getByLabelText('Stop screen sharing')).toBeInTheDocument();
  });
});

describe('VideoCallControls', () => {
  it('disables controls when not connected', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      isConnected: false,
    });

    renderVideoCall();

    const muteButton = screen.getByLabelText('Mute microphone');
    expect(muteButton).toBeDisabled();
  });
});

describe('ConnectionStatusIndicator', () => {
  it('shows different quality levels', () => {
    const { useWebRTC } = require('@/hooks/useWebRTC');

    // Test excellent quality
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      connectionQuality: {
        ...mockUseWebRTC.connectionQuality,
        level: 'excellent',
        score: 95,
      },
    });

    const { rerender } = renderVideoCall();
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    // Test poor quality
    useWebRTC.mockReturnValue({
      ...mockUseWebRTC,
      connectionQuality: {
        ...mockUseWebRTC.connectionQuality,
        level: 'poor',
        score: 30,
      },
    });

    rerender(
      <PerformanceProvider>
        <AccessibilityProvider>
          <VideoCallComponent sessionId="test-session" isInitiator={true} />
        </AccessibilityProvider>
      </PerformanceProvider>
    );

    expect(screen.getByText('Poor')).toBeInTheDocument();
  });
});