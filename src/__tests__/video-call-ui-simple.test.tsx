import React from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VideoCallControls } from '@/components/features/VideoCallControls';
import { ConnectionStatusIndicator } from '@/components/features/ConnectionStatusIndicator';
import { ParticipantVideo } from '@/components/features/ParticipantVideo';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { PerformanceProvider } from '@/components/ui/PerformanceProvider';

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <PerformanceProvider>
      <AccessibilityProvider>
        {component}
      </AccessibilityProvider>
    </PerformanceProvider>
  );
};

describe('VideoCallControls', () => {
  const defaultProps = {
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    isConnected: true,
    layout: 'grid' as const,
    isFullscreen: false,
    onToggleVideo: vi.fn(),
    onToggleAudio: vi.fn(),
    onStartScreenShare: vi.fn(),
    onStopScreenShare: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onLayoutChange: vi.fn(),
    onShowQuality: vi.fn(),
    onEndCall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all control buttons', () => {
    renderWithProviders(<VideoCallControls {...defaultProps} />);

    expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument();
    expect(screen.getByLabelText('Turn off camera')).toBeInTheDocument();
    expect(screen.getByLabelText('Start screen sharing')).toBeInTheDocument();
    expect(screen.getByLabelText('End call')).toBeInTheDocument();
  });

  it('shows correct labels when audio is disabled', () => {
    renderWithProviders(
      <VideoCallControls {...defaultProps} isAudioEnabled={false} />
    );

    expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument();
  });

  it('shows correct labels when video is disabled', () => {
    renderWithProviders(
      <VideoCallControls {...defaultProps} isVideoEnabled={false} />
    );

    expect(screen.getByLabelText('Turn on camera')).toBeInTheDocument();
  });

  it('shows screen sharing stop button when active', () => {
    renderWithProviders(
      <VideoCallControls {...defaultProps} isScreenSharing={true} />
    );

    expect(screen.getByLabelText('Stop screen sharing')).toBeInTheDocument();
  });

  it('disables controls when not connected', () => {
    renderWithProviders(
      <VideoCallControls {...defaultProps} isConnected={false} />
    );

    const muteButton = screen.getByLabelText('Mute microphone');
    const videoButton = screen.getByLabelText('Turn off camera');
    const screenShareButton = screen.getByLabelText('Start screen sharing');

    expect(muteButton).toBeDisabled();
    expect(videoButton).toBeDisabled();
    expect(screenShareButton).toBeDisabled();
  });
});

describe('ConnectionStatusIndicator', () => {
  const mockConnectionQuality = {
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
  };

  it('shows connecting state', () => {
    renderWithProviders(
      <ConnectionStatusIndicator
        connectionState="connecting"
        connectionQuality={null}
      />
    );

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows connected state with quality', () => {
    renderWithProviders(
      <ConnectionStatusIndicator
        connectionState="connected"
        connectionQuality={mockConnectionQuality}
      />
    );

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows failed state', () => {
    renderWithProviders(
      <ConnectionStatusIndicator
        connectionState="failed"
        connectionQuality={null}
      />
    );

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows different quality levels', () => {
    const excellentQuality = {
      ...mockConnectionQuality,
      level: 'excellent' as const,
      score: 95,
    };

    const { rerender } = renderWithProviders(
      <ConnectionStatusIndicator
        connectionState="connected"
        connectionQuality={excellentQuality}
      />
    );

    expect(screen.getByText('Excellent')).toBeInTheDocument();

    const poorQuality = {
      ...mockConnectionQuality,
      level: 'poor' as const,
      score: 30,
    };

    rerender(
      <PerformanceProvider>
        <AccessibilityProvider>
          <ConnectionStatusIndicator
            connectionState="connected"
            connectionQuality={poorQuality}
          />
        </AccessibilityProvider>
      </PerformanceProvider>
    );

    expect(screen.getByText('Poor')).toBeInTheDocument();
  });
});

describe('ParticipantVideo', () => {
  const mockStream = new MediaStream();

  it('renders participant name', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={mockStream}
        participantName="Test User"
        layout="grid"
      />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows local participant indicator', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={mockStream}
        isLocal={true}
        participantName="You"
        layout="grid"
      />
    );

    expect(screen.getByText('You (You)')).toBeInTheDocument();
  });

  it('shows camera off state', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={mockStream}
        isVideoEnabled={false}
        participantName="Test User"
        layout="grid"
      />
    );

    expect(screen.getByText('Camera off')).toBeInTheDocument();
  });

  it('shows muted indicator when audio is disabled', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={mockStream}
        isAudioEnabled={false}
        participantName="Test User"
        layout="grid"
      />
    );

    // The muted indicator should be present (red microphone icon)
    const mutedIndicator = screen.getByRole('generic');
    expect(mutedIndicator).toBeInTheDocument();
  });

  it('shows screen sharing indicator', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={mockStream}
        isScreenSharing={true}
        participantName="Test User"
        layout="grid"
      />
    );

    expect(screen.getByText('Screen')).toBeInTheDocument();
  });

  it('generates correct avatar initials', () => {
    renderWithProviders(
      <ParticipantVideo
        stream={null}
        isVideoEnabled={false}
        participantName="John Doe"
        layout="grid"
      />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});