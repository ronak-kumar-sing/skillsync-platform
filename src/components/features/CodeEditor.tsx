'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { CodeEditorState, CodeChangeEvent, CodeParticipant } from '@/types';

interface CodeEditorProps {
  sessionId: string;
  codeState: CodeEditorState;
  onCodeChange: (changes: CodeChangeEvent) => void;
  onCursorMove: (line: number, column: number) => void;
  onLanguageChange: (language: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' }
];

const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export function CodeEditor({
  sessionId,
  codeState,
  onCodeChange,
  onCursorMove,
  onLanguageChange,
  isReadOnly = false,
  className = ''
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(codeState.content);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync external changes to local state
  useEffect(() => {
    if (!isTyping) {
      setLocalContent(codeState.content);
    }
  }, [codeState.content, isTyping]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
    setIsTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);

    // Calculate changes (simplified - in production use operational transforms)
    const changes = [{
      type: 'replace' as const,
      startLine: 0,
      startColumn: 0,
      endLine: codeState.content.split('\n').length - 1,
      endColumn: codeState.content.split('\n').slice(-1)[0]?.length || 0,
      text: newContent
    }];

    const changeEvent: CodeChangeEvent = {
      userId: 'current-user', // This should come from auth context
      sessionId,
      changes,
      timestamp: Date.now()
    };

    onCodeChange(changeEvent);
  }, [sessionId, codeState.content, onCodeChange]);

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    setCursorPosition({ line, column });
    onCursorMove(line, column);
  }, [onCursorMove]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isReadOnly) return;

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        localContent.substring(0, start) +
        '  ' +
        localContent.substring(end);

      setLocalContent(newContent);
      handleContentChange(newContent);

      // Set cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        handleCursorChange();
      }, 0);
    }

    // Save shortcut (Cmd/Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // Could trigger save functionality here
    }
  }, [isReadOnly, localContent, handleContentChange, handleCursorChange]);

  // Render participant cursors (simplified visualization)
  const renderParticipants = () => {
    return codeState.participants.map((participant, index) => (
      <div
        key={participant.userId}
        className="absolute top-2 right-2 flex items-center gap-2 text-xs"
        style={{
          transform: `translateY(${index * 24}px)`,
          color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length] }}
        />
        <span className="text-white/80">{participant.username}</span>
        {participant.isActive && (
          <div className="w-1 h-4 bg-current animate-pulse" />
        )}
      </div>
    ));
  };

  // Get syntax highlighting class (basic implementation)
  const getSyntaxHighlightClass = () => {
    const baseClasses = "font-mono text-sm leading-relaxed";

    switch (codeState.language) {
      case 'javascript':
      case 'typescript':
        return `${baseClasses} text-yellow-300`;
      case 'python':
        return `${baseClasses} text-green-300`;
      case 'html':
        return `${baseClasses} text-orange-300`;
      case 'css':
        return `${baseClasses} text-blue-300`;
      default:
        return `${baseClasses} text-gray-300`;
    }
  };

  return (
    <GlassCard className={`relative h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Code Editor</h3>
          <GlassSelect
            value={codeState.language}
            onChange={(e) => onLanguageChange(e.target.value)}
            options={SUPPORTED_LANGUAGES}
            className="w-32"
            disabled={isReadOnly}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">
            Line {cursorPosition.line + 1}, Col {cursorPosition.column + 1}
          </span>
          {isReadOnly && (
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
              Read Only
            </span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/20 border-r border-white/10 p-2">
          {localContent.split('\n').map((_, index) => (
            <div
              key={index}
              className="text-xs text-white/40 text-right leading-relaxed"
              style={{ height: '1.5rem' }}
            >
              {index + 1}
            </div>
          ))}
        </div>

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleCursorChange}
          onClick={handleCursorChange}
          readOnly={isReadOnly}
          className={`
            w-full h-full pl-16 pr-4 py-2 bg-transparent text-white
            resize-none outline-none border-none
            ${getSyntaxHighlightClass()}
            ${isReadOnly ? 'cursor-default' : 'cursor-text'}
          `}
          placeholder={isReadOnly ? "Waiting for code..." : "Start coding..."}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {/* Participant indicators */}
        {renderParticipants()}

        {/* Typing indicator */}
        {isTyping && (
          <div className="absolute bottom-2 left-16 text-xs text-blue-300 animate-pulse">
            Syncing changes...
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{localContent.split('\n').length} lines</span>
          <span>•</span>
          <span>{localContent.length} characters</span>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(localContent);
            }}
          >
            Copy
          </GlassButton>

          {!isReadOnly && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setLocalContent('');
                handleContentChange('');
              }}
            >
              Clear
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  );
}