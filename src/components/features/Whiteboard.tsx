'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  WhiteboardState,
  WhiteboardElement,
  WhiteboardTool,
  DrawEvent
} from '@/types';

interface WhiteboardProps {
  sessionId: string;
  whiteboardState: WhiteboardState;
  onDraw: (event: DrawEvent) => void;
  onClear: () => void;
  onToolChange: (tool: WhiteboardTool) => void;
  isReadOnly?: boolean;
  className?: string;
}

const DEFAULT_TOOLS: WhiteboardTool[] = [
  { type: 'pen', size: 2, color: '#FFFFFF', opacity: 1 },
  { type: 'pen', size: 5, color: '#FF6B6B', opacity: 1 },
  { type: 'pen', size: 8, color: '#4ECDC4', opacity: 1 },
  { type: 'rectangle', size: 2, color: '#45B7D1', opacity: 0.7 },
  { type: 'circle', size: 2, color: '#96CEB4', opacity: 0.7 },
  { type: 'eraser', size: 10, color: '#000000', opacity: 1 },
];

export function Whiteboard({
  sessionId,
  whiteboardState,
  onDraw,
  onClear,
  onToolChange,
  isReadOnly = false,
  className = ''
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<WhiteboardTool>(DEFAULT_TOOLS[0]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = whiteboardState.canvasSize.width;
    canvas.height = whiteboardState.canvasSize.height;

    // Set default styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
  }, [whiteboardState.canvasSize]);

  // Redraw canvas when elements change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    whiteboardState.elements.forEach(element => {
      drawElement(ctx, element);
    });
  }, [whiteboardState.elements]);

  // Draw individual element
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    ctx.save();

    ctx.globalAlpha = element.style.opacity;
    ctx.strokeStyle = element.style.strokeColor;
    ctx.fillStyle = element.style.fillColor || element.style.strokeColor;
    ctx.lineWidth = element.style.strokeWidth;

    switch (element.type) {
      case 'freehand':
        if (element.data.points && element.data.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.data.points[0].x, element.data.points[0].y);

          for (let i = 1; i < element.data.points.length; i++) {
            ctx.lineTo(element.data.points[i].x, element.data.points[i].y);
          }

          ctx.stroke();
        }
        break;

      case 'rectangle':
        ctx.beginPath();
        ctx.rect(element.position.x, element.position.y, element.size.width, element.size.height);
        if (element.style.fillColor) {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'circle':
        const radius = Math.min(element.size.width, element.size.height) / 2;
        const centerX = element.position.x + element.size.width / 2;
        const centerY = element.position.y + element.size.height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        if (element.style.fillColor) {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'text':
        ctx.font = `${element.style.strokeWidth * 8}px Arial`;
        ctx.fillText(element.data.text, element.position.x, element.position.y);
        break;

      case 'arrow':
        const { startX, startY, endX, endY } = element.data;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 15;

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - Math.PI / 6),
          endY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + Math.PI / 6),
          endY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
    }

    ctx.restore();
  }, []);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;

    const pos = getMousePos(e);
    setIsDrawing(true);
    setCurrentPath([pos]);
    setMousePosition(pos);
  }, [isReadOnly, getMousePos]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setMousePosition(pos);

    if (!isDrawing || isReadOnly) return;

    if (currentTool.type === 'pen' || currentTool.type === 'eraser') {
      setCurrentPath(prev => [...prev, pos]);

      // Draw temporary line for immediate feedback
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && currentPath.length > 1) {
          ctx.save();
          ctx.globalAlpha = currentTool.opacity;
          ctx.strokeStyle = currentTool.type === 'eraser' ? '#000000' : currentTool.color;
          ctx.lineWidth = currentTool.size;
          ctx.globalCompositeOperation = currentTool.type === 'eraser' ? 'destination-out' : 'source-over';

          const lastPos = currentPath[currentPath.length - 2];
          ctx.beginPath();
          ctx.moveTo(lastPos.x, lastPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [isDrawing, isReadOnly, currentTool, currentPath, getMousePos]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || isReadOnly) return;

    setIsDrawing(false);

    if (currentPath.length > 1) {
      const element: WhiteboardElement = {
        id: `element-${Date.now()}-${Math.random()}`,
        type: currentTool.type === 'eraser' ? 'freehand' : 'freehand',
        userId: 'current-user', // This should come from auth context
        position: { x: Math.min(...currentPath.map(p => p.x)), y: Math.min(...currentPath.map(p => p.y)) },
        size: {
          width: Math.max(...currentPath.map(p => p.x)) - Math.min(...currentPath.map(p => p.x)),
          height: Math.max(...currentPath.map(p => p.y)) - Math.min(...currentPath.map(p => p.y))
        },
        style: {
          strokeColor: currentTool.type === 'eraser' ? '#000000' : currentTool.color,
          strokeWidth: currentTool.size,
          opacity: currentTool.opacity
        },
        data: { points: currentPath },
        timestamp: Date.now()
      };

      const drawEvent: DrawEvent = {
        userId: 'current-user', // This should come from auth context
        sessionId,
        element,
        action: 'add',
        timestamp: Date.now()
      };

      onDraw(drawEvent);
    }

    setCurrentPath([]);
  }, [isDrawing, isReadOnly, currentPath, currentTool, sessionId, onDraw]);

  // Handle tool selection
  const handleToolSelect = useCallback((tool: WhiteboardTool) => {
    setCurrentTool(tool);
    onToolChange(tool);
  }, [onToolChange]);

  // Render participant cursors
  const renderParticipantCursors = () => {
    return whiteboardState.participants.map((participant, index) => (
      <div
        key={participant.userId}
        className="absolute pointer-events-none z-10"
        style={{
          left: participant.cursor.x,
          top: participant.cursor.y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div
          className="w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: participant.color }}
        />
        <div
          className="absolute top-4 left-0 text-xs text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap"
        >
          {participant.username}
        </div>
      </div>
    ));
  };

  return (
    <GlassCard className={`relative h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Whiteboard</h3>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">
            {whiteboardState.elements.length} elements
          </span>
          {isReadOnly && (
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
              Read Only
            </span>
          )}
        </div>
      </div>

      {/* Tools */}
      {!isReadOnly && (
        <div className="flex items-center gap-2 p-4 border-b border-white/10 overflow-x-auto">
          {DEFAULT_TOOLS.map((tool, index) => (
            <GlassButton
              key={index}
              size="sm"
              variant={currentTool === tool ? 'primary' : 'ghost'}
              onClick={() => handleToolSelect(tool)}
              className="flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{
                    backgroundColor: tool.type === 'eraser' ? 'transparent' : tool.color,
                    borderColor: tool.color,
                    width: `${Math.max(8, tool.size)}px`,
                    height: `${Math.max(8, tool.size)}px`
                  }}
                />
                <span className="capitalize text-xs">{tool.type}</span>
              </div>
            </GlassButton>
          ))}

          <div className="w-px h-6 bg-white/20 mx-2" />

          <GlassButton
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="text-red-300 hover:text-red-200"
          >
            Clear All
          </GlassButton>
        </div>
      )}

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden bg-black/20">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isReadOnly ? 'default' :
              currentTool.type === 'eraser' ? 'grab' : 'crosshair'
          }}
        />

        {/* Participant cursors */}
        {renderParticipantCursors()}

        {/* Mouse position indicator */}
        {!isReadOnly && (
          <div className="absolute bottom-2 left-2 text-xs text-white/60 bg-black/50 px-2 py-1 rounded">
            {Math.round(mousePosition.x)}, {Math.round(mousePosition.y)}
          </div>
        )}
      </div>
    </GlassCard>
  );
}