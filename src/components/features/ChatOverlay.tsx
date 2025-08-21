'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { ChatState, ChatMessage } from '@/types';

interface ChatOverlayProps {
  chatState: ChatState;
  onSendMessage: (content: string, type?: 'text' | 'code') => void;
  onFileShare: (file: File) => Promise<void>;
  onMarkAsRead: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

export function ChatOverlay({
  chatState,
  onSendMessage,
  onFileShare,
  onMarkAsRead,
  isMinimized = false,
  onToggleMinimize,
  className = ''
}: ChatOverlayProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  // Mark messages as read when chat is visible
  useEffect(() => {
    if (!isMinimized && chatState.unreadCount > 0) {
      onMarkAsRead();
    }
  }, [isMinimized, chatState.unreadCount, onMarkAsRead]);

  // Handle message send
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    // Detect if message looks like code (simple heuristic)
    const isCode = message.includes('{') || message.includes('}') ||
      message.includes('function') || message.includes('const ') ||
      message.includes('let ') || message.includes('var ') ||
      message.includes('import ') || message.includes('export ');

    onSendMessage(message.trim(), isCode ? 'code' : 'text');
    setMessage('');
    setIsTyping(false);
  }, [message, onSendMessage]);

  // Handle typing indicator
  const handleInputChange = useCallback((value: string) => {
    setMessage(value);

    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      // In real implementation, emit typing start event
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // In real implementation, emit typing stop event
    }, 1000);
  }, [isTyping]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileShare(files[0]);
    }
  }, [onFileShare]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Handle file input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileShare(files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileShare]);

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  // Render message
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isCurrentUser = msg.userId === 'current-user'; // This should come from auth context
    const isSystemMessage = msg.type === 'system';

    if (isSystemMessage) {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <div className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">
            {msg.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        className={`flex mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
          {/* Username and timestamp */}
          <div className={`flex items-center gap-2 mb-1 text-xs text-white/60 ${isCurrentUser ? 'justify-end' : 'justify-start'
            }`}>
            <span>{isCurrentUser ? 'You' : msg.username}</span>
            <span>•</span>
            <span>{formatTime(msg.timestamp)}</span>
          </div>

          {/* Message content */}
          <div className={`
            rounded-lg px-3 py-2 text-sm
            ${isCurrentUser
              ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
              : 'bg-white/10 text-white border border-white/20'
            }
          `}>
            {msg.type === 'code' ? (
              <pre className="font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                <code>{msg.content}</code>
              </pre>
            ) : msg.type === 'file' ? (
              <div className="flex items-center gap-2">
                <span>📎</span>
                <div>
                  <div className="font-medium">{msg.metadata?.fileName}</div>
                  <div className="text-xs text-white/60">
                    {msg.metadata?.fileSize ? `${(msg.metadata.fileSize / 1024).toFixed(1)} KB` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <span>{msg.content}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render typing indicators
  const renderTypingIndicators = () => {
    const typingUsers = Object.entries(chatState.isTyping)
      .filter(([_, isTyping]) => isTyping)
      .map(([userId]) => chatState.participants.find(p => p.userId === userId))
      .filter(Boolean);

    if (typingUsers.length === 0) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-white/60 px-3 py-2">
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" />
          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        <span>
          {typingUsers.length === 1
            ? `${typingUsers[0]?.username} is typing...`
            : `${typingUsers.length} people are typing...`
          }
        </span>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <GlassButton
          onClick={onToggleMinimize}
          className="relative"
        >
          💬 Chat
          {chatState.unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {chatState.unreadCount > 99 ? '99+' : chatState.unreadCount}
            </div>
          )}
        </GlassButton>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 h-96 z-50 ${className}`}>
      <GlassCard className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Chat</span>
            <div className="flex items-center gap-1">
              {chatState.participants.map((participant, index) => (
                <div
                  key={participant.userId}
                  className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-400' : 'bg-gray-400'
                    }`}
                  title={participant.username}
                />
              ))}
            </div>
          </div>

          <GlassButton
            size="sm"
            variant="ghost"
            onClick={onToggleMinimize}
          >
            ➖
          </GlassButton>
        </div>

        {/* Messages */}
        <div
          className={`flex-1 overflow-y-auto p-3 ${dragOver ? 'bg-blue-500/10 border-2 border-dashed border-blue-500/50' : ''
            }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {chatState.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/60 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <>
              {chatState.messages.map(renderMessage)}
              {renderTypingIndicators()}
              <div ref={messagesEndRef} />
            </>
          )}

          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-lg">
              <div className="text-center text-blue-300">
                <div className="text-2xl mb-2">📎</div>
                <div className="text-sm">Drop file to share</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-1">
              <GlassInput
                value={message}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />

            <GlassButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </GlassButton>

            <GlassButton
              type="submit"
              size="sm"
              disabled={!message.trim()}
            >
              Send
            </GlassButton>
          </form>
        </div>
      </GlassCard>
    </div>
  );
}