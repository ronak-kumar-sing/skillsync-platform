# Real-time Communication Infrastructure

This document describes the comprehensive real-time communication infrastructure implemented for the SkillSync platform, including Socket.io server setup, WebRTC peer-to-peer communication, and collaborative features.

## Overview

The real-time infrastructure consists of:

1. **Socket.io Server** - Multi-namespace real-time communication
2. **WebRTC Service** - Peer-to-peer video/audio and data channels
3. **React Hooks** - Easy integration with React components
4. **Collaboration Features** - Code editing, whiteboard, chat, screen sharing
5. **Connection Management** - Authentication, reconnection, error handling

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Socket.io      │    │   WebRTC P2P    │
│                 │    │  Server         │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ useSocket   │◄┼────┼►│ Namespaces  │ │    │ │ Video/Audio │ │
│ │ useWebRTC   │ │    │ │ /queue      │ │    │ │ Data Channel│ │
│ │ useCollab   │ │    │ │ /collab     │ │    │ │ Screen Share│ │
│ └─────────────┘ │    │ │ /matching   │ │    │ └─────────────┘ │
└─────────────────┘    │ └─────────────┘ │    └─────────────────┘
                       └─────────────────┘
```

## Components

### 1. Socket.io Server (`src/lib/socket-server.ts`)

Multi-namespace Socket.io server with authentication and event handling:

- **Main Namespace (`/`)** - General real-time features
- **Queue Namespace (`/queue`)** - Matching queue updates
- **Collaboration Namespace (`/collaboration`)** - Video calls and collaborative tools
- **Matching Namespace (`/matching`)** - Match notifications and session invites

**Features:**
- JWT authentication middleware
- Connection tracking and cleanup
- Event broadcasting and room management
- Error handling and logging

### 2. WebRTC Service (`src/services/webrtc.service.ts`)

Comprehensive WebRTC implementation for peer-to-peer communication:

**Features:**
- Video/audio streaming with media constraints
- Data channels for messaging and file transfer
- Screen sharing with track replacement
- ICE candidate handling and STUN/TURN support
- Connection state management
- Media controls (mute/unmute, video on/off)

**Configuration:**
```typescript
const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN servers for production
  ],
  iceCandidatePoolSize: 10,
};
```

### 3. React Hooks

#### `useSocket` - General Socket.io connection
```typescript
const socket = useSocket({
  namespace: '/collaboration',
  autoConnect: true,
  reconnection: true,
});
```

#### `useWebRTC` - WebRTC peer connection
```typescript
const webrtc = useWebRTC({
  socket: socket.socket,
  sessionId: 'session-123',
  isInitiator: true,
});
```

#### `useCollaboration` - Complete collaboration suite
```typescript
const collaboration = useCollaboration({
  sessionId: 'session-123',
  isInitiator: true,
  enableWebRTC: true,
});
```

### 4. Client-side Socket Management (`src/lib/socket-client.ts`)

Utilities for managing Socket.io connections:

- Connection caching and reuse
- Automatic reconnection handling
- Promise-based acknowledgments
- Connection state monitoring

## Usage Examples

### Basic Socket Connection

```typescript
import { useSocket } from '@/hooks/useSocket';

function MyComponent() {
  const socket = useSocket({ namespace: '/collaboration' });

  useEffect(() => {
    if (socket.isConnected) {
      socket.emit('join_room', { roomId: 'room-123' });
    }
  }, [socket.isConnected]);

  return <div>Connected: {socket.isConnected}</div>;
}
```

### Video Call Setup

```typescript
import { useWebRTC } from '@/hooks/useWebRTC';

function VideoCall({ sessionId, isInitiator }) {
  const webrtc = useWebRTC({
    socket: collaborationSocket,
    sessionId,
    isInitiator,
    autoStart: true,
  });

  return (
    <div>
      <video ref={localVideoRef} srcObject={webrtc.localStream} autoPlay muted />
      <video ref={remoteVideoRef} srcObject={webrtc.remoteStream} autoPlay />

      <button onClick={webrtc.toggleVideo}>
        {webrtc.isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
      </button>
      <button onClick={webrtc.toggleAudio}>
        {webrtc.isAudioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={webrtc.startScreenShare}>Share Screen</button>
    </div>
  );
}
```

### Collaboration Session

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';

function CollaborationSession({ sessionId }) {
  const collab = useCollaboration({
    sessionId,
    isInitiator: true,
    autoJoin: true,
  });

  const sendChatMessage = () => {
    collab.sendMessage('Hello everyone!');
  };

  const handleCodeChange = (changes) => {
    collab.sendCodeChange(changes, codeVersion);
  };

  return (
    <div>
      <div>Participants: {collab.participants.length}</div>
      <div>Messages: {collab.messages.length}</div>

      {/* Video call component */}
      <VideoCall webrtc={collab.webrtc} />

      {/* Chat component */}
      <Chat
        messages={collab.messages}
        onSendMessage={collab.sendMessage}
      />

      {/* Code editor component */}
      <CodeEditor
        onChange={handleCodeChange}
        cursorPositions={collab.cursorPositions}
      />

      {/* Whiteboard component */}
      <Whiteboard
        draws={collab.whiteboardDraws}
        onDraw={collab.sendWhiteboardDraw}
      />
    </div>
  );
}
```

## Server Setup

### Next.js API Route (`src/pages/api/socket.ts`)

```typescript
import { initializeSocketServer } from '@/lib/socket-server';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = initializeSocketServer(res.socket.server);
    res.socket.server.io = io;
  }
  res.end();
}
```

### Initialize in Application

```typescript
import { initializeSocketIO } from '@/lib/socket-client';

// Initialize Socket.io server
await initializeSocketIO();
```

## Event Types

### Socket.io Events

#### Collaboration Namespace (`/collaboration`)
- `join_session` - Join a collaboration session
- `leave_session` - Leave a collaboration session
- `chat_message` - Send/receive chat messages
- `code_change` - Collaborative code editing
- `cursor_position` - Real-time cursor positions
- `whiteboard_draw` - Whiteboard drawing events
- `screen_share_start/stop` - Screen sharing notifications
- `webrtc_offer/answer/ice_candidate` - WebRTC signaling

#### Queue Namespace (`/queue`)
- `join_queue` - Join matching queue
- `leave_queue` - Leave matching queue
- `queue_status` - Queue position updates
- `match_found` - Match notification

#### Matching Namespace (`/matching`)
- `match_response` - Accept/decline match
- `session_invite` - Session invitation
- `session_invite_response` - Invitation response

### WebRTC Data Channel Events
- Chat messages
- File transfers
- Collaborative cursors
- Custom application data

## Error Handling

### Connection Errors
```typescript
const socket = useSocket();

if (socket.error) {
  console.error('Socket error:', socket.error);
  socket.clearError();
  socket.connect();
}
```

### WebRTC Errors
```typescript
const webrtc = useWebRTC({...});

if (webrtc.error) {
  console.error('WebRTC error:', webrtc.error);
  webrtc.clearError();
  webrtc.startConnection();
}
```

## Testing

Comprehensive test suite covering:
- Socket.io connection management
- WebRTC peer connection setup
- Collaboration features
- Error handling scenarios
- Connection recovery

Run tests:
```bash
npm run test:run src/__tests__/socket-webrtc.test.ts
```

## Performance Considerations

### WebRTC Optimization
- Adaptive bitrate based on connection quality
- Automatic video quality adjustment
- Connection state monitoring
- ICE candidate optimization

### Socket.io Optimization
- Connection pooling and reuse
- Event batching for high-frequency updates
- Namespace isolation for better performance
- Memory cleanup on disconnection

## Security

### Authentication
- JWT token validation on connection
- User session verification
- Rate limiting on events
- Input validation and sanitization

### WebRTC Security
- Encrypted peer-to-peer connections
- Secure signaling through Socket.io
- Media permission handling
- TURN server authentication (production)

## Production Deployment

### Environment Variables
```env
NEXT_PUBLIC_SOCKET_URL=wss://your-domain.com
NEXT_PUBLIC_TURN_SERVER_URL=turn:your-turn-server.com
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=credential
```

### TURN Server Setup
For production WebRTC, configure TURN servers for NAT traversal:
- Coturn server setup
- Authentication credentials
- Load balancing for multiple servers

### Scaling Considerations
- Redis adapter for Socket.io clustering
- Load balancer with sticky sessions
- WebRTC media server for group calls (optional)
- Monitoring and analytics

## Monitoring and Analytics

### Connection Metrics
- Active connections count
- Connection success/failure rates
- Reconnection frequency
- Average session duration

### WebRTC Metrics
- Video/audio quality metrics
- Connection establishment time
- Bandwidth usage
- Error rates by type

### Performance Monitoring
```typescript
// Get WebRTC statistics
const stats = await webrtc.getStats();
console.log('Connection stats:', stats);

// Monitor Socket.io connections
console.log('Connected users:', getConnectedUsersCount());
```

## Future Enhancements

1. **Recording Functionality** - Record video calls and collaboration sessions
2. **File Sharing** - Enhanced file transfer via WebRTC data channels
3. **Voice Activity Detection** - Automatic mute/unmute based on speech
4. **Multi-party Calls** - Support for group video calls (3+ participants)
5. **Mobile Optimization** - Enhanced mobile WebRTC support
6. **AI Integration** - Real-time transcription and translation

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check network connectivity
   - Verify authentication tokens
   - Check firewall/proxy settings

2. **WebRTC Issues**
   - Camera/microphone permissions
   - NAT/firewall traversal (need TURN servers)
   - Browser compatibility

3. **Performance Issues**
   - Network bandwidth limitations
   - CPU usage for video processing
   - Memory leaks from unclosed connections

### Debug Tools
- Browser DevTools WebRTC internals
- Socket.io debug mode
- Network analysis tools
- Performance profiling

This infrastructure provides a solid foundation for real-time communication features in the SkillSync platform, supporting video calls, collaborative editing, and live updates with proper error handling and scalability considerations.