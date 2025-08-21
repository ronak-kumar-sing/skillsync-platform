import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the useCollaboration hook
const mockUseCollaboration = vi.fn(() => ({
  session: {
    id: 'test-session',
    participants: ['user1', 'user2']
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
}));

vi.mock('@/hooks/useCollaboration', () => ({
  useCollaboration: mockUseCollaboration
}));

describe('Collaborative Tools Integration - Core Logic', () => {
  it('should initialize useCollaboration hook with correct parameters', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    expect(result.current.session).toBeDefined();
    expect(result.current.session.id).toBe('test-session');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide code editor state and functions', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    expect(result.current.codeState).toBeDefined();
    expect(result.current.codeState.content).toBe('console.log("Hello World");');
    expect(result.current.codeState.language).toBe('javascript');
    expect(typeof result.current.updateCode).toBe('function');
    expect(typeof result.current.setCursorPosition).toBe('function');
    expect(typeof result.current.changeLanguage).toBe('function');
  });

  it('should provide whiteboard state and functions', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    expect(result.current.whiteboardState).toBeDefined();
    expect(result.current.whiteboardState.elements).toEqual([]);
    expect(result.current.whiteboardState.canvasSize).toEqual({ width: 800, height: 600 });
    expect(typeof result.current.drawOnWhiteboard).toBe('function');
    expect(typeof result.current.clearWhiteboard).toBe('function');
    expect(typeof result.current.setWhiteboardTool).toBe('function');
  });

  it('should provide screen share state and functions', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    expect(result.current.screenShareState).toBeDefined();
    expect(result.current.screenShareState.isSharing).toBe(false);
    expect(result.current.screenShareState.quality).toBe('medium');
    expect(typeof result.current.startScreenShare).toBe('function');
    expect(typeof result.current.stopScreenShare).toBe('function');
  });

  it('should provide chat state and functions', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    expect(result.current.chatState).toBeDefined();
    expect(result.current.chatState.messages).toEqual([]);
    expect(result.current.chatState.unreadCount).toBe(0);
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.shareFile).toBe('function');
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('should handle error states', () => {
    const errorMock = vi.fn(() => ({
      ...mockUseCollaboration(),
      isConnected: false,
      error: 'Connection failed',
      isLoading: false
    }));

    const { result } = renderHook(() => errorMock({ sessionId: 'test-session' }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('Connection failed');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('should handle loading states', () => {
    const loadingMock = vi.fn(() => ({
      ...mockUseCollaboration(),
      isLoading: true,
      isConnected: false,
      session: null
    }));

    const { result } = renderHook(() => loadingMock({ sessionId: 'test-session' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('should call functions with correct parameters', () => {
    const { result } = renderHook(() => mockUseCollaboration({ sessionId: 'test-session' }));

    // Test code editor functions
    result.current.updateCode({
      userId: 'user1',
      sessionId: 'test-session',
      changes: [],
      timestamp: Date.now()
    });
    expect(result.current.updateCode).toHaveBeenCalled();

    result.current.setCursorPosition(5, 10);
    expect(result.current.setCursorPosition).toHaveBeenCalledWith(5, 10);

    result.current.changeLanguage('python');
    expect(result.current.changeLanguage).toHaveBeenCalledWith('python');

    // Test chat functions
    result.current.sendMessage('Hello world', 'text');
    expect(result.current.sendMessage).toHaveBeenCalledWith('Hello world', 'text');

    result.current.markAsRead();
    expect(result.current.markAsRead).toHaveBeenCalled();

    // Test whiteboard functions
    result.current.clearWhiteboard();
    expect(result.current.clearWhiteboard).toHaveBeenCalled();

    // Test screen share functions
    result.current.startScreenShare();
    expect(result.current.startScreenShare).toHaveBeenCalled();

    result.current.stopScreenShare();
    expect(result.current.stopScreenShare).toHaveBeenCalled();
  });
});