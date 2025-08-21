'use client';

import React from 'react';
import { CollaborativeWorkspace } from '@/components/features';
import { GlassCard } from '@/components/ui/GlassCard';

export default function CollaborativeToolsDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <GlassCard className="mb-6 p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Collaborative Tools Demo
            </h1>
            <p className="text-white/70">
              Experience real-time code editing, whiteboard collaboration, screen sharing, and chat
            </p>
          </div>
        </GlassCard>

        {/* Collaborative Workspace */}
        <div className="h-[calc(100vh-200px)]">
          <CollaborativeWorkspace
            sessionId="demo-session-123"
            className="h-full"
          />
        </div>

        {/* Instructions */}
        <GlassCard className="mt-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-white/80">
            <div>
              <h3 className="font-semibold text-white mb-2">💻 Code Editor</h3>
              <p>Real-time collaborative code editing with syntax highlighting and multi-cursor support.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🎨 Whiteboard</h3>
              <p>Draw diagrams, sketches, and visual explanations together in real-time.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🖥️ Screen Share</h3>
              <p>Share your screen, specific windows, or browser tabs with your learning partner.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">💬 Chat</h3>
              <p>Text chat with file sharing, code snippets, and message history.</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}