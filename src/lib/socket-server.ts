import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from './auth';
import { QueueSocketService } from '@/services/queue-socket.service';
import { DashboardSocketService } from '@/services/dashboard-socket.service';

// Socket.io server instance
let io: SocketIOServer | null = null;

// User connection tracking
const userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUsers = new Map<string, string>(); // socketId -> userId

/**
 * Initialize Socket.io server with HTTP server
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize queue socket service
  QueueSocketService.initialize(io);

  // Initialize dashboard socket service
  DashboardSocketService.initialize();

  // Set up main namespace for general real-time features
  setupMainNamespace(io);

  // Set up collaboration namespace for video calls and collaborative tools
  setupCollaborationNamespace(io);

  // Set up matching namespace for real-time matching updates
  setupMatchingNamespace(io);

  // Set up dashboard namespace for real-time analytics and activity
  setupDashboardNamespace(io);

  console.log('Socket.io server initialized');
  return io;
}

/**
 * Main namespace for general real-time features
 */
function setupMainNamespace(io: SocketIOServer): void {
  const mainNamespace = io.of('/');

  mainNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = decoded.userId;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  mainNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Main socket connected: ${socket.id} for user: ${userId}`);

    // Track user connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socket.id);
    socketUsers.set(socket.id, userId);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Handle user status updates
    socket.on('update_status', (data) => {
      const { status, activity } = data;

      // Broadcast status update to user's connections
      socket.to(`user:${userId}`).emit('user_status_update', {
        userId,
        status,
        activity,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { sessionId } = data;
      socket.to(`session:${sessionId}`).emit('user_typing', {
        userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data) => {
      const { sessionId } = data;
      socket.to(`session:${sessionId}`).emit('user_typing', {
        userId,
        isTyping: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Main socket disconnected: ${socket.id} for user: ${userId}, reason: ${reason}`);

      // Clean up user connections
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
        }
      }
      socketUsers.delete(socket.id);
    });
  });
}

/**
 * Collaboration namespace for video calls and collaborative tools
 */
function setupCollaborationNamespace(io: SocketIOServer): void {
  const collabNamespace = io.of('/collaboration');

  collabNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = decoded.userId;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  collabNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Collaboration socket connected: ${socket.id} for user: ${userId}`);

    // Handle session joining
    socket.on('join_session', (data) => {
      const { sessionId } = data;
      socket.join(`session:${sessionId}`);

      // Notify other participants
      socket.to(`session:${sessionId}`).emit('user_joined_session', {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`User ${userId} joined collaboration session: ${sessionId}`);
    });

    // Handle session leaving
    socket.on('leave_session', (data) => {
      const { sessionId } = data;
      socket.leave(`session:${sessionId}`);

      // Notify other participants
      socket.to(`session:${sessionId}`).emit('user_left_session', {
        userId,
        timestamp: new Date().toISOString(),
      });

      console.log(`User ${userId} left collaboration session: ${sessionId}`);
    });

    // Enhanced WebRTC signaling events with logging and validation
    socket.on('webrtc_offer', (data) => {
      const { sessionId, targetUserId, offer } = data;

      console.log(`WebRTC offer from ${userId} to ${targetUserId} in session ${sessionId}`);

      if (!offer || !offer.type || !offer.sdp) {
        console.error('Invalid WebRTC offer received');
        return;
      }

      socket.to(`session:${sessionId}`).emit('webrtc_offer', {
        fromUserId: userId,
        targetUserId,
        offer,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('webrtc_answer', (data) => {
      const { sessionId, targetUserId, answer } = data;

      console.log(`WebRTC answer from ${userId} to ${targetUserId} in session ${sessionId}`);

      if (!answer || !answer.type || !answer.sdp) {
        console.error('Invalid WebRTC answer received');
        return;
      }

      socket.to(`session:${sessionId}`).emit('webrtc_answer', {
        fromUserId: userId,
        targetUserId,
        answer,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      const { sessionId, targetUserId, candidate } = data;

      console.log(`ICE candidate from ${userId} to ${targetUserId}: ${candidate.type} ${candidate.protocol}`);

      if (!candidate || !candidate.candidate) {
        console.error('Invalid ICE candidate received');
        return;
      }

      socket.to(`session:${sessionId}`).emit('webrtc_ice_candidate', {
        fromUserId: userId,
        targetUserId,
        candidate,
        timestamp: new Date().toISOString(),
      });
    });

    // Connection quality reporting
    socket.on('webrtc_quality_report', (data) => {
      const { sessionId, quality } = data;

      // Broadcast quality report to other participants for monitoring
      socket.to(`session:${sessionId}`).emit('webrtc_quality_report', {
        fromUserId: userId,
        quality,
        timestamp: new Date().toISOString(),
      });
    });

    // Connection establishment events
    socket.on('webrtc_connection_established', (data) => {
      const { sessionId, connectionTime, metrics } = data;

      console.log(`WebRTC connection established for user ${userId} in ${connectionTime}ms`);

      socket.to(`session:${sessionId}`).emit('webrtc_connection_established', {
        fromUserId: userId,
        connectionTime,
        metrics,
        timestamp: new Date().toISOString(),
      });
    });

    // Connection failure events
    socket.on('webrtc_connection_failed', (data) => {
      const { sessionId, error, metrics } = data;

      console.log(`WebRTC connection failed for user ${userId}: ${error}`);

      socket.to(`session:${sessionId}`).emit('webrtc_connection_failed', {
        fromUserId: userId,
        error,
        metrics,
        timestamp: new Date().toISOString(),
      });
    });

    // Collaborative code editor events
    socket.on('code_change', (data) => {
      const { sessionId, changes, version } = data;
      socket.to(`session:${sessionId}`).emit('code_change', {
        fromUserId: userId,
        changes,
        version,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('cursor_position', (data) => {
      const { sessionId, position, selection } = data;
      socket.to(`session:${sessionId}`).emit('cursor_position', {
        userId,
        position,
        selection,
      });
    });

    // Whiteboard events
    socket.on('whiteboard_draw', (data) => {
      const { sessionId, drawData } = data;
      socket.to(`session:${sessionId}`).emit('whiteboard_draw', {
        fromUserId: userId,
        drawData,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('whiteboard_clear', (data) => {
      const { sessionId } = data;
      socket.to(`session:${sessionId}`).emit('whiteboard_clear', {
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Screen sharing events
    socket.on('screen_share_start', (data) => {
      const { sessionId } = data;
      socket.to(`session:${sessionId}`).emit('screen_share_start', {
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('screen_share_stop', (data) => {
      const { sessionId } = data;
      socket.to(`session:${sessionId}`).emit('screen_share_stop', {
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Chat events
    socket.on('chat_message', (data) => {
      const { sessionId, message, messageType = 'text' } = data;

      const chatMessage = {
        id: generateMessageId(),
        fromUserId: userId,
        message,
        messageType,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all session participants including sender
      collabNamespace.to(`session:${sessionId}`).emit('chat_message', chatMessage);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Collaboration socket disconnected: ${socket.id} for user: ${userId}, reason: ${reason}`);

      // Notify all sessions this user was part of
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('session:'));
      rooms.forEach(room => {
        socket.to(room).emit('user_left_session', {
          userId,
          timestamp: new Date().toISOString(),
        });
      });
    });
  });
}

/**
 * Matching namespace for real-time matching updates and notifications
 */
function setupMatchingNamespace(io: SocketIOServer): void {
  const matchingNamespace = io.of('/matching');

  matchingNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = decoded.userId;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  matchingNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Matching socket connected: ${socket.id} for user: ${userId}`);

    // Join user to their personal matching room
    socket.join(`user:${userId}`);

    // Handle match notifications
    socket.on('match_response', (data) => {
      const { matchId, response, partnerId } = data; // response: 'accept' | 'decline'

      // Notify the partner about the response
      socket.to(`user:${partnerId}`).emit('match_response', {
        fromUserId: userId,
        matchId,
        response,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle session invitations
    socket.on('session_invite', (data) => {
      const { targetUserId, sessionId, sessionType } = data;

      socket.to(`user:${targetUserId}`).emit('session_invite', {
        fromUserId: userId,
        sessionId,
        sessionType,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('session_invite_response', (data) => {
      const { sessionId, response, inviterUserId } = data;

      socket.to(`user:${inviterUserId}`).emit('session_invite_response', {
        fromUserId: userId,
        sessionId,
        response,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Matching socket disconnected: ${socket.id} for user: ${userId}, reason: ${reason}`);
    });
  });
}

/**
 * Utility functions
 */

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get Socket.io server instance
export function getSocketServer(): SocketIOServer | null {
  return io;
}

// Broadcast to specific user across all their connections
export function broadcastToUser(userId: string, event: string, data: any): void {
  if (!io) return;

  io.of('/').to(`user:${userId}`).emit(event, data);
}

// Broadcast to session participants
export function broadcastToSession(sessionId: string, event: string, data: any): void {
  if (!io) return;

  io.of('/collaboration').to(`session:${sessionId}`).emit(event, data);
}

// Get connected users count
export function getConnectedUsersCount(): number {
  return userConnections.size;
}

// Check if user is connected
export function isUserConnected(userId: string): boolean {
  return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
}

// Get user's active socket connections
export function getUserSocketIds(userId: string): string[] {
  const sockets = userConnections.get(userId);
  return sockets ? Array.from(sockets) : [];
}

// Disconnect all user sockets
export function disconnectUser(userId: string): void {
  if (!io) return;

  const socketIds = getUserSocketIds(userId);
  socketIds.forEach(socketId => {
    const socket = io!.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  });
}

/**
 * Dashboard namespace for real-time analytics and activity updates
 */
function setupDashboardNamespace(io: SocketIOServer): void {
  const dashboardNamespace = io.of('/dashboard');

  dashboardNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = decoded.userId;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  dashboardNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Dashboard socket connected: ${socket.id} for user: ${userId}`);

    // Join user to dashboard updates room
    socket.join('dashboard_updates');

    // Send initial connection confirmation
    socket.emit('dashboard_connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Handle requests for real-time updates
    socket.on('subscribe_metrics', (data) => {
      const { metrics } = data; // Array of metric types to subscribe to

      metrics.forEach((metric: string) => {
        socket.join(`metrics:${metric}`);
      });

      console.log(`User ${userId} subscribed to metrics: ${metrics.join(', ')}`);
    });

    socket.on('unsubscribe_metrics', (data) => {
      const { metrics } = data;

      metrics.forEach((metric: string) => {
        socket.leave(`metrics:${metric}`);
      });

      console.log(`User ${userId} unsubscribed from metrics: ${metrics.join(', ')}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Dashboard socket disconnected: ${socket.id} for user: ${userId}, reason: ${reason}`);
    });
  });
}

// Dashboard-specific broadcast functions
export function broadcastDashboardUpdate(event: string, data: any): void {
  if (!io) return;
  io.of('/dashboard').to('dashboard_updates').emit(event, data);
}

export function broadcastMetricUpdate(metricType: string, data: any): void {
  if (!io) return;
  io.of('/dashboard').to(`metrics:${metricType}`).emit(`${metricType}:update`, data);
}