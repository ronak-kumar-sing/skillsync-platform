'use client';

import React, { useState, useCallback } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { CodeEditor } from './CodeEditor';
import { Whiteboard } from './Whiteboard';
import { ScreenShare } from './ScreenShare';
import { ChatOverlay } from './ChatOverlay';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface CollaborativeWorkspaceProps {
  sessionId: string;
  className?: string;
}

type ActiveTool = 'code' | 'whiteboard' | 'screen' | 'split';

export function CollaborativeWorkspace({
  sessionId,
  className = ''
}: CollaborativeWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>('code');
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  const {
    session,
    isConnected,
    isLoading,
    error,
    codeState,
    updateCode,
    setCursorPosition,
    changeLanguage,
    whiteboardState,
    drawOnWhiteboard,
    clearWhiteboard,
    setWhiteboardTool,
    screenShareState,
    startScreenShare,
    stopScreenShare,
    chatState,
    sendMessage,
    shareFile,
    markAsRead,
    clearError
  } = useCollaboration({ sessionId });

  // Handle tool switching
  const handleToolSwitch = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
  }, []);

  // Handle chat toggle
  const handleChatToggle = useCallback(() => {
    setIsChatMinimized(prev => !prev);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <LoadingSkeleton className="h-full" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <GlassCard className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Connection Error</h3>
          <p className="text-white/60 mb-4">{error}</p>
          <GlassButton onClick={clearError}>
            Try Again
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  // Render not connected state
  if (!isConnected) {
    return (
      <GlassCard className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
          <p className="text-white/60">Establishing connection to collaboration session</p>
        </div>
      </GlassCard>
    );
  }

  // Render main workspace
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Collaborative Tools</h2>

          {session && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>•</span>
              <span>{session.participants.length} participants</span>
            </div>
          )}
        </div>

        {/* Tool selector */}
        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            variant={activeTool === 'code' ? 'primary' : 'ghost'}
            onClick={() => handleToolSwitch('code')}
          >
            💻 Code
          </GlassButton>

          <GlassButton
            size="sm"
            variant={activeTool === 'whiteboard' ? 'primary' : 'ghost'}
            onClick={() => handleToolSwitch('whiteboard')}
          >
            🎨 Whiteboard
          </GlassButton>

          <GlassButton
            size="sm"
            variant={activeTool === 'screen' ? 'primary' : 'ghost'}
            onClick={() => handleToolSwitch('screen')}
          >
            🖥️ Screen
          </GlassButton>

          <GlassButton
            size="sm"
            variant={activeTool === 'split' ? 'primary' : 'ghost'}
            onClick={() => handleToolSwitch('split')}
          >
            ⚡ Split
          </GlassButton>

          <div className="w-px h-6 bg-white/20 mx-2" />

          <GlassButton
            size="sm"
            variant="ghost"
            onClick={handleChatToggle}
            className="relative"
          >
            💬 Chat
            {chatState.unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {chatState.unreadCount > 9 ? '9+' : chatState.unreadCount}
              </div>
            )}
          </GlassButton>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        {activeTool === 'code' && (
          <CodeEditor
            sessionId={sessionId}
            codeState={codeState}
            onCodeChange={updateCode}
            onCursorMove={setCursorPosition}
            onLanguageChange={changeLanguage}
            className="h-full"
          />
        )}

        {activeTool === 'whiteboard' && (
          <Whiteboard
            sessionId={sessionId}
            whiteboardState={whiteboardState}
            onDraw={drawOnWhiteboard}
            onClear={clearWhiteboard}
            onToolChange={setWhiteboardTool}
            className="h-full"
          />
        )}

        {activeTool === 'screen' && (
          <ScreenShare
            screenShareState={screenShareState}
            onStartShare={startScreenShare}
            onStopShare={stopScreenShare}
            className="h-full"
          />
        )}

        {activeTool === 'split' && (
          <div className="h-full grid grid-cols-2 gap-4 p-4">
            <CodeEditor
              sessionId={sessionId}
              codeState={codeState}
              onCodeChange={updateCode}
              onCursorMove={setCursorPosition}
              onLanguageChange={changeLanguage}
              className="h-full"
            />

            <Whiteboard
              sessionId={sessionId}
              whiteboardState={whiteboardState}
              onDraw={drawOnWhiteboard}
              onClear={clearWhiteboard}
              onToolChange={setWhiteboardTool}
              className="h-full"
            />
          </div>
        )}

        {/* Connection status indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 rounded-lg px-3 py-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
          <span className="text-white">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Chat overlay */}
      <ChatOverlay
        chatState={chatState}
        onSendMessage={sendMessage}
        onFileShare={shareFile}
        onMarkAsRead={markAsRead}
        isMinimized={isChatMinimized}
        onToggleMinimize={handleChatToggle}
      />
    </div>
  );
}