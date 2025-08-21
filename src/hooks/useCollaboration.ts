'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollaborationSocket } from './useSocket';
import {
  CollaborationSession,
  CodeEditorState,
  WhiteboardState,
  ScreenShareState,
  ChatState,
  ChatMessage,
  CodeChangeEvent,
  DrawEvent,
  FileShareEvent,
  CollaborationSocketEvents
} from '@/types';

interface UseCollaborationOptions {
  sessionId: string;
  autoJoin?: boolean;
}

interface UseCollaborationReturn {
  // Session state
  session: CollaborationSession | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Code editor
  codeState: CodeEditorState;
  updateCode: (changes: CodeChangeEvent) => void;
  setCursorPosition: (line: number, column: number) => void;
  changeLanguage: (language: string) => void;

  // Whiteboard
  whiteboardState: WhiteboardState;
  drawOnWhiteboard: (event: DrawEvent) => void;
  clearWhiteboard: () => void;
  setWhiteboardTool: (tool: any) => void;

  // Screen sharing
  screenShareState: ScreenShareState;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  // Chat
  chatState: ChatState;
  sendMessage: (content: string, type?: 'text' | 'code') => void;
  shareFile: (file: File) => Promise<void>;
  markAsRead: () => void;

  // Session management
  joinSession: () => void;
  leaveSession: () => void;
  clearError: () => void;
}

export function useCollaboration({
  sessionId,
  autoJoin = true
}: UseCollaborationOptions): UseCollaborationReturn {
  const { socket, isConnected, error: socketError, emit, on, off } = useCollaborationSocket();

  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Individual tool states
  const [codeState, setCodeState] = useState<CodeEditorState>({
    content: '',
    language: 'javascript',
    cursorPosition: { line: 0, column: 0 },
    selections: [],
    participants: []
  });

  const [whiteboardState, setWhiteboardState] = useState<WhiteboardState>({
    elements: [],
    participants: [],
    canvasSize: { width: 800, height: 600 },
    zoom: 1,
    pan: { x: 0, y: 0 }
  });

  const [screenShareState, setScreenShareState] = useState<ScreenShareState>({
    isSharing: false,
    quality: 'medium',
    hasAudio: false
  });

  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    participants: [],
    isTyping: {},
    unreadCount: 0
  });

  const screenStreamRef = useRef<MediaStream | null>(null);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Session events
    const handleSessionSync = (sessionData: CollaborationSession) => {
      setSession(sessionData);
      setCodeState(sessionData.tools.codeEditor);
      setWhiteboardState(sessionData.tools.whiteboard);
      setScreenShareState(sessionData.tools.screenShare);
      setChatState(sessionData.tools.chat);
      setIsLoading(false);
    };

    // Code editor events
    const handleCodeChange = (event: CodeChangeEvent) => {
      setCodeState(prev => {
        const newContent = applyCodeChanges(prev.content, event.changes);
        return { ...prev, content: newContent };
      });
    };

    const handleCursorMove = ({ userId, position }: { userId: string; position: { line: number; column: number } }) => {
      setCodeState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.userId === userId ? { ...p, cursorPosition: position } : p
        )
      }));
    };

    // Whiteboard events
    const handleWhiteboardDraw = (event: DrawEvent) => {
      setWhiteboardState(prev => {
        let newElements = [...prev.elements];

        switch (event.action) {
          case 'add':
            newElements.push(event.element);
            break;
          case 'update':
            newElements = newElements.map(el =>
              el.id === event.element.id ? event.element : el
            );
            break;
          case 'delete':
            newElements = newElements.filter(el => el.id !== event.element.id);
            break;
        }

        return { ...prev, elements: newElements };
      });
    };

    const handleWhiteboardClear = () => {
      setWhiteboardState(prev => ({ ...prev, elements: [] }));
    };

    // Screen share events
    const handleScreenShareStart = ({ userId, streamId }: { userId: string; streamId: string }) => {
      setScreenShareState(prev => ({
        ...prev,
        isSharing: true,
        sharerUserId: userId,
        streamId
      }));
    };

    const handleScreenShareStop = () => {
      setScreenShareState(prev => ({
        ...prev,
        isSharing: false,
        sharerUserId: undefined,
        streamId: undefined
      }));
    };

    // Chat events
    const handleChatMessage = (message: ChatMessage) => {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        unreadCount: prev.unreadCount + 1
      }));
    };

    const handleTypingStart = ({ userId }: { userId: string }) => {
      setChatState(prev => ({
        ...prev,
        isTyping: { ...prev.isTyping, [userId]: true }
      }));
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setChatState(prev => ({
        ...prev,
        isTyping: { ...prev.isTyping, [userId]: false }
      }));
    };

    // Register event listeners
    on('session:sync', handleSessionSync);
    on('code:change', handleCodeChange);
    on('code:cursor-move', handleCursorMove);
    on('whiteboard:draw', handleWhiteboardDraw);
    on('whiteboard:clear', handleWhiteboardClear);
    on('screen:start-share', handleScreenShareStart);
    on('screen:stop-share', handleScreenShareStop);
    on('chat:message', handleChatMessage);
    on('chat:typing-start', handleTypingStart);
    on('chat:typing-stop', handleTypingStop);

    // Auto-join session if enabled
    if (autoJoin) {
      joinSession();
    }

    return () => {
      // Cleanup event listeners
      off('session:sync', handleSessionSync);
      off('code:change', handleCodeChange);
      off('code:cursor-move', handleCursorMove);
      off('whiteboard:draw', handleWhiteboardDraw);
      off('whiteboard:clear', handleWhiteboardClear);
      off('screen:start-share', handleScreenShareStart);
      off('screen:stop-share', handleScreenShareStop);
      off('chat:message', handleChatMessage);
      off('chat:typing-start', handleTypingStart);
      off('chat:typing-stop', handleTypingStop);
    };
  }, [socket, isConnected, autoJoin, on, off]);

  // Helper function to apply code changes
  const applyCodeChanges = (content: string, changes: any[]) => {
    // Simple implementation - in production, use operational transforms
    let newContent = content;

    changes.forEach(change => {
      const lines = newContent.split('\n');

      switch (change.type) {
        case 'insert':
          lines[change.startLine] =
            lines[change.startLine].slice(0, change.startColumn) +
            change.text +
            lines[change.startLine].slice(change.startColumn);
          break;
        case 'delete':
          lines[change.startLine] =
            lines[change.startLine].slice(0, change.startColumn) +
            lines[change.startLine].slice(change.endColumn);
          break;
        case 'replace':
          lines[change.startLine] =
            lines[change.startLine].slice(0, change.startColumn) +
            change.text +
            lines[change.startLine].slice(change.endColumn);
          break;
      }

      newContent = lines.join('\n');
    });

    return newContent;
  };

  // Code editor functions
  const updateCode = useCallback((changes: CodeChangeEvent) => {
    emit('code:change', changes);
  }, [emit]);

  const setCursorPosition = useCallback((line: number, column: number) => {
    emit('code:cursor-move', { position: { line, column } });
  }, [emit]);

  const changeLanguage = useCallback((language: string) => {
    emit('code:language-change', { language });
    setCodeState(prev => ({ ...prev, language }));
  }, [emit]);

  // Whiteboard functions
  const drawOnWhiteboard = useCallback((event: DrawEvent) => {
    emit('whiteboard:draw', event);
  }, [emit]);

  const clearWhiteboard = useCallback(() => {
    emit('whiteboard:clear', {});
  }, [emit]);

  const setWhiteboardTool = useCallback((tool: any) => {
    emit('whiteboard:tool-change', { tool });
  }, [emit]);

  // Screen sharing functions
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      screenStreamRef.current = stream;
      const streamId = `screen-${Date.now()}`;

      emit('screen:start-share', { streamId });

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      setScreenShareState(prev => ({
        ...prev,
        isSharing: true,
        streamId,
        hasAudio: stream.getAudioTracks().length > 0
      }));
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setError('Failed to start screen sharing');
    }
  }, [emit]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    emit('screen:stop-share', {});
    setScreenShareState(prev => ({
      ...prev,
      isSharing: false,
      streamId: undefined,
      hasAudio: false
    }));
  }, [emit]);

  // Chat functions
  const sendMessage = useCallback((content: string, type: 'text' | 'code' = 'text') => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: 'current-user', // This should come from auth context
      username: 'Current User', // This should come from auth context
      content,
      type,
      timestamp: new Date(),
      ...(type === 'code' && { metadata: { codeLanguage: codeState.language } })
    };

    emit('chat:message', message);
  }, [emit, codeState.language]);

  const shareFile = useCallback(async (file: File) => {
    try {
      // In production, upload file to storage service first
      const fileUrl = URL.createObjectURL(file);

      const fileShareEvent: FileShareEvent = {
        userId: 'current-user', // This should come from auth context
        sessionId,
        file: {
          id: `file-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: fileUrl
        },
        timestamp: Date.now()
      };

      emit('chat:file-share', fileShareEvent);
    } catch (error) {
      console.error('Failed to share file:', error);
      setError('Failed to share file');
    }
  }, [emit, sessionId]);

  const markAsRead = useCallback(() => {
    setChatState(prev => ({ ...prev, unreadCount: 0 }));
  }, []);

  // Session management
  const joinSession = useCallback(() => {
    if (socket && isConnected) {
      emit('session:join', { sessionId });
      setIsLoading(true);
      setError(null);
    }
  }, [socket, isConnected, emit, sessionId]);

  const leaveSession = useCallback(() => {
    if (socket && isConnected) {
      emit('session:leave', { sessionId });

      // Stop screen sharing if active
      if (screenShareState.isSharing) {
        stopScreenShare();
      }
    }
  }, [socket, isConnected, emit, sessionId, screenShareState.isSharing, stopScreenShare]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
    };
  }, [leaveSession]);

  return {
    // Session state
    session,
    isConnected,
    isLoading,
    error: error || socketError,

    // Code editor
    codeState,
    updateCode,
    setCursorPosition,
    changeLanguage,

    // Whiteboard
    whiteboardState,
    drawOnWhiteboard,
    clearWhiteboard,
    setWhiteboardTool,

    // Screen sharing
    screenShareState,
    startScreenShare,
    stopScreenShare,

    // Chat
    chatState,
    sendMessage,
    shareFile,
    markAsRead,

    // Session management
    joinSession,
    leaveSession,
    clearError
  };
}