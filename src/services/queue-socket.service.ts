import { Server as SocketIOServer } from 'socket.io';
import { QueueManagerService } from './queue-manager.service';
import { verifyToken } from '@/lib/auth';

/**
 * Socket.io service for real-time queue updates and notifications
 */
export class QueueSocketService {
  private static io: SocketIOServer | null = null;
  private static userSockets = new Map<string, string>(); // userId -> socketId
  private static socketUsers = new Map<string, string>(); // socketId -> userId

  /**
   * Initialize Socket.io server for queue management
   */
  static initialize(io: SocketIOServer): void {
    this.io = io;

    // Create queue namespace
    const queueNamespace = io.of('/queue');

    queueNamespace.on('connection', (socket) => {
      console.log(`Queue socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          const decoded = verifyToken(token);

          if (!decoded) {
            socket.emit('auth_error', { message: 'Invalid token' });
            socket.disconnect();
            return;
          }

          const userId = decoded.userId;

          // Store user-socket mapping
          this.userSockets.set(userId, socket.id);
          this.socketUsers.set(socket.id, userId);

          // Join user to their personal room
          socket.join(`user:${userId}`);

          // Send authentication success
          socket.emit('authenticated', { userId });

          // Send current queue status if user is in queue
          try {
            const queueStatus = await QueueManagerService.getQueueStatus(userId);
            socket.emit('queue_status', queueStatus);
          } catch (error) {
            // User not in queue, that's fine
          }

        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle queue join requests
      socket.on('join_queue', async (data) => {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const matchingRequest = {
            userId,
            preferredSkills: data.preferredSkills || [],
            sessionType: data.sessionType,
            maxDuration: data.maxDuration || 60,
            urgency: data.urgency || 'medium',
          };

          const queueStatus = await QueueManagerService.addToQueue(matchingRequest);

          socket.emit('queue_joined', {
            success: true,
            queueStatus,
          });

          // Broadcast queue stats update to all connected clients
          this.broadcastQueueStats();

        } catch (error) {
          console.error('Error joining queue via socket:', error);
          socket.emit('queue_error', {
            message: 'Failed to join queue',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle queue leave requests
      socket.on('leave_queue', async () => {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          await QueueManagerService.removeFromQueue(userId);

          socket.emit('queue_left', { success: true });

          // Broadcast queue stats update
          this.broadcastQueueStats();

        } catch (error) {
          console.error('Error leaving queue via socket:', error);
          socket.emit('queue_error', {
            message: 'Failed to leave queue',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle queue status requests
      socket.on('get_queue_status', async () => {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const queueStatus = await QueueManagerService.getQueueStatus(userId);
          socket.emit('queue_status', queueStatus);
        } catch (error) {
          socket.emit('queue_status', null); // User not in queue
        }
      });

      // Handle queue stats requests
      socket.on('get_queue_stats', async () => {
        try {
          const stats = await QueueManagerService.getQueueStats();
          socket.emit('queue_stats', stats);
        } catch (error) {
          console.error('Error getting queue stats via socket:', error);
          socket.emit('queue_error', {
            message: 'Failed to get queue stats',
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = this.socketUsers.get(socket.id);
        if (userId) {
          this.userSockets.delete(userId);
          this.socketUsers.delete(socket.id);
        }
        console.log(`Queue socket disconnected: ${socket.id}`);
      });
    });

    // Subscribe to queue updates from Redis
    this.subscribeToQueueUpdates();
  }

  /**
   * Subscribe to Redis pub/sub for queue updates
   */
  private static subscribeToQueueUpdates(): void {
    QueueManagerService.subscribeToQueueUpdates((channel, message) => {
      if (!this.io) return;

      const queueNamespace = this.io.of('/queue');

      switch (message.type) {
        case 'user_joined':
          // Notify the user who joined
          this.notifyUser(message.data.userId, 'queue_position_update', message.data.queueStatus);

          // Broadcast updated stats to all clients
          this.broadcastQueueStats();
          break;

        case 'user_left':
          // Notify the user who left (if still connected)
          this.notifyUser(message.data.userId, 'queue_left', { success: true });

          // Broadcast updated stats to all clients
          this.broadcastQueueStats();
          break;

        case 'match_found':
          // Notify both users about the match
          this.notifyUser(message.data.userId1, 'match_found', {
            partnerId: message.data.userId2,
            sessionId: message.data.sessionId,
            compatibilityScore: message.data.compatibilityScore,
          });

          this.notifyUser(message.data.userId2, 'match_found', {
            partnerId: message.data.userId1,
            sessionId: message.data.sessionId,
            compatibilityScore: message.data.compatibilityScore,
          });

          // Broadcast updated stats
          this.broadcastQueueStats();
          break;

        case 'queue_rebalanced':
          // Notify all users in queue about position updates
          queueNamespace.emit('queue_rebalanced', {
            timestamp: message.timestamp,
          });
          break;
      }
    });
  }

  /**
   * Notify a specific user via their socket connection
   */
  private static notifyUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const queueNamespace = this.io.of('/queue');
    queueNamespace.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast queue statistics to all connected clients
   */
  private static async broadcastQueueStats(): Promise<void> {
    if (!this.io) return;

    try {
      const stats = await QueueManagerService.getQueueStats();
      const queueNamespace = this.io.of('/queue');
      queueNamespace.emit('queue_stats_update', stats);
    } catch (error) {
      console.error('Error broadcasting queue stats:', error);
    }
  }

  /**
   * Send queue position updates to users periodically
   */
  static async sendQueuePositionUpdates(): Promise<void> {
    if (!this.io) return;

    const queueNamespace = this.io.of('/queue');

    // Get all connected users
    for (const [userId, socketId] of this.userSockets) {
      try {
        const queueStatus = await QueueManagerService.getQueueStatus(userId);
        queueNamespace.to(`user:${userId}`).emit('queue_position_update', queueStatus);
      } catch (error) {
        // User not in queue anymore, that's fine
      }
    }
  }

  /**
   * Start periodic queue position updates
   */
  static startPeriodicUpdates(): void {
    // Send position updates every 30 seconds
    setInterval(() => {
      this.sendQueuePositionUpdates().catch(console.error);
    }, 30 * 1000);

    // Broadcast stats updates every 60 seconds
    setInterval(() => {
      this.broadcastQueueStats().catch(console.error);
    }, 60 * 1000);
  }

  /**
   * Get connected users count
   */
  static getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  static isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Disconnect user socket
   */
  static disconnectUser(userId: string): void {
    const socketId = this.userSockets.get(userId);
    if (socketId && this.io) {
      const queueNamespace = this.io.of('/queue');
      const socket = queueNamespace.sockets.get(socketId);
      if (socket) {
        socket.disconnect();
      }
    }
  }
}