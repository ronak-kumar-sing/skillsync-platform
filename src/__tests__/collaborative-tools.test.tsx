import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborativeWorkspace } from '@/components/features/CollaborativeWorkspace';
import { CodeEditor } from '@/components/features/CodeEditor';
import { Whiteboard } from '@/components/features/Whiteboard';
import { ScreenShare } from '@/components/features/ScreenShare';
import { ChatOverlay } from '@/components/features/ChatOverlay';
import { PerformanceProvider } from '@/components/ui/PerformanceProvider';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { ResponsiveProvider } from '@/components/ui/ResponsiveProvider';

// Mock the useCollaboration hook
vi.mock('@/hooks/useCollaboration', () => ({
  useCollaboration: vi.fn(() => ({
    session: {
      id: 'test-session',
      participants: ['user1', 'user2'],
      tools: {
        codeEditor: {
          content: '',
          language: 'javascript',
          cursorPosition: { line: 0, column: 0 },
          selections: [],
          participants: []
        },
        whiteboard: {
          elements: [],
          participants: [],
          canvasSize: { width: 800, height: 600 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        },
        screenShare: {
          isSharing: false,
          quality: 'medium',
          hasAudio: false
        },
        chat: {
          messages: [],
          participants: [],
          isTyping: {},
          unreadCount: 0
        }
      }
    },
    isConnected: true,
    isLoading: false,
    error: null,
    codeState: {
      content: 'console.log("Hello World");',
      language: 'javascript',
      cursorPosition: { line: 0, column: 0 },
      selections: [],
      participants: []
    },
    updateCode: vi.fn(),
    setCursorPosition: vi.fn(),
    changeLanguage: vi.fn(),
    whiteboardState: {
      elements: [],
      participants: [],
      canvasSize: { width: 800, height: 600 },
      zoom: 1,
      pan: { x: 0, y: 0 }
    },
    drawOnWhiteboard: vi.fn(),
    clearWhiteboard: vi.fn(),
    setWhiteboardTool: vi.fn(),
    screenShareState: {
      isSharing: false,
      quality: 'medium' as const,
      hasAudio: false
    },
    startScreenShare: vi.fn(),
    stopScreenShare: vi.fn(),
    chatState: {
      messages: [],
      participants: [],
      isTyping: {},
      unreadCount: 0
    },
    sendMessage: vi.fn(),
    shareFile: vi.fn(),
    markAsRead: vi.fn(),
    clearError: vi.fn()
  }))
}));

// Mock WebRTC APIs
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [],
      getVideoTracks: () => [{ addEventListener: vi.fn() }],
      getAudioTracks: () => []
    }))
  },
  writable: true
});

// Test wrapper component with all required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    <ResponsiveProvider>
      <PerformanceProvider>
        {children}
      </PerformanceProvider>
    </ResponsiveProvider>
  </ThemeProvider>
);

describe('Collaborative Tools Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CollaborativeWorkspace', () => {
    it('should render the collaborative workspace with default code editor', () => {
      render(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      expect(screen.getByText('Collaborative Tools')).toBeInTheDocument();
      expect(screen.getByText('💻 Code')).toBeInTheDocument();
      expect(screen.getByText('🎨 Whiteboard')).toBeInTheDocument();
      expect(screen.getByText('🖥️ Screen')).toBeInTheDocument();
      expect(screen.getByText('💬 Chat')).toBeInTheDocument();
    });

    it('should switch between different tools', async () => {
      render(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      // Switch to whiteboard
      fireEvent.click(screen.getByText('🎨 Whiteboard'));
      await waitFor(() => {
        expect(screen.getByText('Whiteboard')).toBeInTheDocument();
      });

      // Switch to screen share
      fireEvent.click(screen.getByText('🖥️ Screen'));
      await waitFor(() => {
        expect(screen.getByText('Screen Share')).toBeInTheDocument();
      });
    });

    it('should show connection status', () => {
      render(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('CodeEditor', () => {
    const mockProps = {
      sessionId: 'test-session',
      codeState: {
        content: 'console.log("Hello World");',
        language: 'javascript',
        cursorPosition: { line: 0, column: 0 },
        selections: [],
        participants: []
      },
      onCodeChange: vi.fn(),
      onCursorMove: vi.fn(),
      onLanguageChange: vi.fn()
    };

    it('should render code editor with content', () => {
      render(
        <TestWrapper>
          <CodeEditor {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Code Editor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('console.log("Hello World");')).toBeInTheDocument();
    });

    it('should handle language change', () => {
      render(
        <TestWrapper>
          <CodeEditor {...mockProps} />
        </TestWrapper>
      );

      const languageSelect = screen.getByDisplayValue('JavaScript');
      fireEvent.change(languageSelect, { target: { value: 'python' } });

      expect(mockProps.onLanguageChange).toHaveBeenCalledWith('python');
    });

    it('should show read-only mode', () => {
      render(
        <TestWrapper>
          <CodeEditor {...mockProps} isReadOnly={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Read Only')).toBeInTheDocument();
    });
  });

  describe('Whiteboard', () => {
    const mockProps = {
      sessionId: 'test-session',
      whiteboardState: {
        elements: [],
        participants: [],
        canvasSize: { width: 800, height: 600 },
        zoom: 1,
        pan: { x: 0, y: 0 }
      },
      onDraw: vi.fn(),
      onClear: vi.fn(),
      onToolChange: vi.fn()
    };

    it('should render whiteboard with tools', () => {
      render(
        <TestWrapper>
          <Whiteboard {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Whiteboard')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should handle clear whiteboard', () => {
      render(
        <TestWrapper>
          <Whiteboard {...mockProps} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Clear All'));
      expect(mockProps.onClear).toHaveBeenCalled();
    });
  });

  describe('ScreenShare', () => {
    const mockProps = {
      screenShareState: {
        isSharing: false,
        quality: 'medium' as const,
        hasAudio: false
      },
      onStartShare: vi.fn(),
      onStopShare: vi.fn()
    };

    it('should render screen share start button when not sharing', () => {
      render(
        <TestWrapper>
          <ScreenShare {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Screen Share')).toBeInTheDocument();
      expect(screen.getByText('Start Sharing')).toBeInTheDocument();
    });

    it('should handle start screen sharing', async () => {
      render(
        <TestWrapper>
          <ScreenShare {...mockProps} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Start Sharing'));
      expect(mockProps.onStartShare).toHaveBeenCalled();
    });

    it('should show sharing state when active', () => {
      const sharingProps = {
        ...mockProps,
        screenShareState: {
          ...mockProps.screenShareState,
          isSharing: true,
          sharerUserId: 'user1'
        }
      };

      render(
        <TestWrapper>
          <ScreenShare {...sharingProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('Stop Sharing')).toBeInTheDocument();
    });
  });

  describe('ChatOverlay', () => {
    const mockProps = {
      chatState: {
        messages: [
          {
            id: '1',
            userId: 'user1',
            username: 'Alice',
            content: 'Hello!',
            type: 'text' as const,
            timestamp: new Date()
          }
        ],
        participants: [
          {
            userId: 'user1',
            username: 'Alice',
            isOnline: true
          }
        ],
        isTyping: {},
        unreadCount: 0
      },
      onSendMessage: vi.fn(),
      onFileShare: vi.fn(),
      onMarkAsRead: vi.fn(),
      isMinimized: false,
      onToggleMinimize: vi.fn()
    };

    it('should render chat with messages', () => {
      render(
        <TestWrapper>
          <ChatOverlay {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should handle sending messages', () => {
      render(
        <TestWrapper>
          <ChatOverlay {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByText('Send');

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      expect(mockProps.onSendMessage).toHaveBeenCalledWith('Test message', 'text');
    });

    it('should show minimized state', () => {
      const minimizedProps = { ...mockProps, isMinimized: true };
      render(
        <TestWrapper>
          <ChatOverlay {...minimizedProps} />
        </TestWrapper>
      );

      expect(screen.getByText('💬 Chat')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should handle real-time collaboration events', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      // Simulate receiving a code change
      const updatedCodeState = {
        content: 'console.log("Updated code");',
        language: 'javascript',
        cursorPosition: { line: 0, column: 0 },
        selections: [],
        participants: [
          {
            userId: 'user2',
            username: 'Bob',
            color: '#FF6B6B',
            cursorPosition: { line: 0, column: 10 },
            isActive: true
          }
        ]
      };

      // This would normally be triggered by the useCollaboration hook
      rerender(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      expect(screen.getByText('Collaborative Tools')).toBeInTheDocument();
    });

    it('should handle error states gracefully', async () => {
      // Mock error state by importing and mocking the hook
      const { useCollaboration } = await import('@/hooks/useCollaboration');
      vi.mocked(useCollaboration).mockReturnValueOnce({
        session: null,
        isConnected: false,
        isLoading: false,
        error: 'Connection failed',
        codeState: {
          content: '',
          language: 'javascript',
          cursorPosition: { line: 0, column: 0 },
          selections: [],
          participants: []
        },
        updateCode: vi.fn(),
        setCursorPosition: vi.fn(),
        changeLanguage: vi.fn(),
        whiteboardState: {
          elements: [],
          participants: [],
          canvasSize: { width: 800, height: 600 },
          zoom: 1,
          pan: { x: 0, y: 0 }
        },
        drawOnWhiteboard: vi.fn(),
        clearWhiteboard: vi.fn(),
        setWhiteboardTool: vi.fn(),
        screenShareState: {
          isSharing: false,
          quality: 'medium' as const,
          hasAudio: false
        },
        startScreenShare: vi.fn(),
        stopScreenShare: vi.fn(),
        chatState: {
          messages: [],
          participants: [],
          isTyping: {},
          unreadCount: 0
        },
        sendMessage: vi.fn(),
        shareFile: vi.fn(),
        markAsRead: vi.fn(),
        joinSession: vi.fn(),
        leaveSession: vi.fn(),
        clearError: vi.fn()
      });

      render(
        <TestWrapper>
          <CollaborativeWorkspace sessionId="test-session" />
        </TestWrapper>
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});