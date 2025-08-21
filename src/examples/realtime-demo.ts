/**
 * Real-time Communication Infrastructure Demo
 *
 * This file demonstrates the usage of the Socket.io and WebRTC infrastructure
 * that has been implemented for the SkillSync platform.
 */

import { useSocket, useCollaborationSocket, useMatchingSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCollaboration } from '@/hooks/useCollaboration';
import { WebRTCService } from '@/services/webrtc.service';
import { initializeSocketIO, createSocket } from '@/lib/socket-client';

// Example 1: Basic Socket.io Connection
export function basicSocketExample() {
  console.log('=== Basic Socket.io Connection Example ===');

  // Initialize Socket.io server
  initializeSocketIO().then(() => {
    console.log('Socket.io server initialized');

    // Create a socket connection
    const socket = createSocket('/', 'user-token-123');

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);

      // Send a test message
      socket.emit('test-message', { data: 'Hello from client!' });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Connect to server
    socket.connect();
  });
}

// Example 2: Collaboration Session
export function collaborationExample() {
  console.log('=== Collaboration Session Example ===');

  // This would typically be used in a React component
  const sessionId = 'session-123';

  // The useCollaboration hook provides all collaboration features
  const collaboration = useCollaboration({
    sessionId,
    isInitiator: true,
    autoJoin: true,
    enableWebRTC: true,
  });

  // Example usage:
  console.log('Collaboration state:', {
    isConnected: collaboration.isConnected,
    isInSession: collaboration.isInSession,
    participants: collaboration.participants,
    webrtcState: collaboration.webrtc.connectionState,
  });

  // Send a chat message
  collaboration.sendMessage('Hello everyone!');

  // Send code changes
  collaboration.sendCodeChange({
    type: 'insert',
    position: { line: 1, column: 0 },
    text: 'console.log("Hello, world!");'
  }, 1);

  // Draw on whiteboard
  collaboration.sendWhiteboardDraw({
    type: 'line',
    points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    color: '#000000',
    width: 2,
  });

  // Start screen sharing
  collaboration.webrtc.startScreenShare();
}

// Example 3: WebRTC Video Call
export function webrtcExample() {
  console.log('=== WebRTC Video Call Example ===');

  const socket = createSocket('/collaboration', 'user-token-123');
  const sessionId = 'video-session-456';

  const webrtc = useWebRTC({
    socket,
    sessionId,
    isInitiator: true,
    autoStart: true,
  });

  // Handle WebRTC events
  webrtc.onDataChannelMessage((message) => {
    console.log('Received message via WebRTC:', message);
  });

  // Example usage:
  console.log('WebRTC state:', {
    connectionState: webrtc.connectionState,
    isConnected: webrtc.isConnected,
    isVideoEnabled: webrtc.isVideoEnabled,
    isAudioEnabled: webrtc.isAudioEnabled,
  });

  // Toggle media
  webrtc.toggleVideo();
  webrtc.toggleAudio();

  // Send message through data channel
  webrtc.sendMessage({
    type: 'chat',
    text: 'Hello via WebRTC data channel!',
    timestamp: new Date().toISOString(),
  });
}

// Example 4: Queue Management with Real-time Updates
export function queueExample() {
  console.log('=== Queue Management Example ===');

  const queueSocket = useMatchingSocket();

  // Listen for queue events
  queueSocket.on('queue_stats_update', (stats) => {
    console.log('Queue stats updated:', stats);
  });

  queueSocket.on('match_found', (match) => {
    console.log('Match found!', match);

    // Start collaboration session with matched user
    const collaboration = useCollaboration({
      sessionId: match.sessionId,
      isInitiator: true,
      autoJoin: true,
      enableWebRTC: true,
    });

    console.log('Starting collaboration with partner:', match.partnerId);
  });

  // Join matching queue
  queueSocket.emit('join_queue', {
    preferredSkills: ['javascript', 'react'],
    sessionType: 'learning',
    maxDuration: 60,
    urgency: 'medium',
  });
}

// Example 5: Server-side Socket.io Setup
export function serverSetupExample() {
  console.log('=== Server Setup Example ===');

  // This demonstrates how the server is set up (would be in a server file)
  /*
  import { createServer } from 'http';
  import { initializeSocketServer } from '@/lib/socket-server';

  const httpServer = createServer();
  const io = initializeSocketServer(httpServer);

  // The server automatically handles:
  // - Authentication via JWT tokens
  // - Multiple namespaces (/queue, /collaboration, /matching)
  // - WebRTC signaling
  // - Real-time collaboration events
  // - Connection management and cleanup

  httpServer.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
  */
}

// Example 6: Error Handling and Reconnection
export function errorHandlingExample() {
  console.log('=== Error Handling Example ===');

  const socket = useSocket({
    namespace: '/collaboration',
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  // Handle connection errors
  if (socket.error) {
    console.error('Socket error:', socket.error);

    // Clear error and retry
    socket.clearError();
    socket.connect();
  }

  // Handle WebRTC errors
  const webrtc = useWebRTC({
    socket: socket.socket,
    sessionId: 'test-session',
    isInitiator: false,
  });

  if (webrtc.error) {
    console.error('WebRTC error:', webrtc.error);

    // Clear error and retry
    webrtc.clearError();
    webrtc.startConnection();
  }
}

// Example 7: Performance Monitoring
export function performanceExample() {
  console.log('=== Performance Monitoring Example ===');

  const webrtc = useWebRTC({
    socket: null,
    sessionId: 'perf-test',
    isInitiator: true,
  });

  // Monitor connection quality
  setInterval(async () => {
    const stats = await webrtc.getStats?.();
    if (stats) {
      console.log('WebRTC Stats:', {
        connectionState: webrtc.connectionState,
        // Parse RTCStatsReport for specific metrics
        timestamp: new Date().toISOString(),
      });
    }
  }, 5000);
}

// Export all examples for easy testing
export const realtimeExamples = {
  basicSocket: basicSocketExample,
  collaboration: collaborationExample,
  webrtc: webrtcExample,
  queue: queueExample,
  serverSetup: serverSetupExample,
  errorHandling: errorHandlingExample,
  performance: performanceExample,
};

// Usage instructions
console.log(`
Real-time Communication Infrastructure Implementation Complete!

Available Features:
✅ Socket.io Server with multiple namespaces
✅ WebRTC peer-to-peer video/audio communication
✅ Real-time collaboration (code, whiteboard, chat)
✅ Queue management with live updates
✅ Connection management and reconnection
✅ Error handling and recovery
✅ React hooks for easy integration
✅ Comprehensive test coverage

Usage:
1. Initialize Socket.io server: await initializeSocketIO()
2. Use hooks in React components: useSocket, useWebRTC, useCollaboration
3. Handle real-time events and state updates
4. Implement video calls with WebRTC
5. Enable collaborative features (code editing, whiteboard, chat)

Next Steps:
- Integrate with UI components
- Add TURN servers for production WebRTC
- Implement file sharing via WebRTC data channels
- Add voice activity detection
- Implement recording functionality
`);