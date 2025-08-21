import { io, Socket } from 'socket.io-client';

// Socket instances cache
const sockets = new Map<string, Socket>();

/**
 * Initialize Socket.io server by making a request to the API endpoint
 */
export async function initializeSocketIO(): Promise<void> {
  try {
    const response = await fetch('/api/socket');
    if (!response.ok) {
      throw new Error('Failed to initialize Socket.io server');
    }
    console.log('Socket.io server initialization requested');
  } catch (error) {
    console.error('Failed to initialize Socket.io server:', error);
    throw error;
  }
}

/**
 * Create or get existing socket connection for a namespace
 */
export function createSocket(namespace: string = '/', token?: string): Socket {
  const socketKey = `${namespace}_${token || 'anonymous'}`;

  if (sockets.has(socketKey)) {
    const existingSocket = sockets.get(socketKey)!;
    if (existingSocket.connected || existingSocket.connecting) {
      return existingSocket;
    } else {
      // Clean up disconnected socket
      existingSocket.removeAllListeners();
      sockets.delete(socketKey);
    }
  }

  const socketUrl = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
    : 'http://localhost:3000';

  const socket = io(`${socketUrl}${namespace}`, {
    auth: token ? { token } : undefined,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 5,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Add connection logging
  socket.on('connect', () => {
    console.log(`Socket connected to ${namespace}:`, socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected from ${namespace}:`, reason);
  });

  socket.on('connect_error', (error) => {
    console.error(`Socket connection error for ${namespace}:`, error);
  });

  // Store socket instance
  sockets.set(socketKey, socket);

  return socket;
}

/**
 * Get existing socket for namespace
 */
export function getSocket(namespace: string = '/', token?: string): Socket | null {
  const socketKey = `${namespace}_${token || 'anonymous'}`;
  return sockets.get(socketKey) || null;
}

/**
 * Disconnect and cleanup socket
 */
export function disconnectSocket(namespace: string = '/', token?: string): void {
  const socketKey = `${namespace}_${token || 'anonymous'}`;
  const socket = sockets.get(socketKey);

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    sockets.delete(socketKey);
    console.log(`Socket disconnected and cleaned up for ${namespace}`);
  }
}

/**
 * Disconnect all sockets
 */
export function disconnectAllSockets(): void {
  sockets.forEach((socket, key) => {
    socket.removeAllListeners();
    socket.disconnect();
    console.log(`Socket disconnected: ${key}`);
  });
  sockets.clear();
}

/**
 * Get connection status for namespace
 */
export function isSocketConnected(namespace: string = '/', token?: string): boolean {
  const socket = getSocket(namespace, token);
  return socket ? socket.connected : false;
}

/**
 * Wait for socket to connect
 */
export function waitForConnection(socket: Socket, timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(new Error('Socket connection timeout'));
    }, timeout);

    const onConnect = () => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      resolve();
    };

    const onError = (error: Error) => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(error);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);

    if (!socket.connected && !socket.connecting) {
      socket.connect();
    }
  });
}

/**
 * Emit event with acknowledgment
 */
export function emitWithAck(
  socket: Socket,
  event: string,
  data: any,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Acknowledgment timeout for event: ${event}`));
    }, timeout);

    socket.emit(event, data, (response: any) => {
      clearTimeout(timer);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Socket connection manager for React components
 */
export class SocketManager {
  private static instance: SocketManager;
  private sockets = new Map<string, Socket>();
  private listeners = new Map<string, Map<string, Set<(...args: any[]) => void>>>();

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(namespace: string, token?: string): Socket {
    const socket = createSocket(namespace, token);
    const key = `${namespace}_${token || 'anonymous'}`;

    this.sockets.set(key, socket);
    this.listeners.set(key, new Map());

    return socket;
  }

  disconnect(namespace: string, token?: string): void {
    const key = `${namespace}_${token || 'anonymous'}`;
    const socket = this.sockets.get(key);

    if (socket) {
      // Remove all tracked listeners
      const socketListeners = this.listeners.get(key);
      if (socketListeners) {
        socketListeners.forEach((callbacks, event) => {
          callbacks.forEach(callback => {
            socket.off(event, callback);
          });
        });
      }

      socket.disconnect();
      this.sockets.delete(key);
      this.listeners.delete(key);
    }
  }

  on(namespace: string, event: string, callback: (...args: any[]) => void, token?: string): void {
    const key = `${namespace}_${token || 'anonymous'}`;
    const socket = this.sockets.get(key);

    if (socket) {
      socket.on(event, callback);

      // Track listener for cleanup
      const socketListeners = this.listeners.get(key);
      if (socketListeners) {
        if (!socketListeners.has(event)) {
          socketListeners.set(event, new Set());
        }
        socketListeners.get(event)!.add(callback);
      }
    }
  }

  off(namespace: string, event: string, callback?: (...args: any[]) => void, token?: string): void {
    const key = `${namespace}_${token || 'anonymous'}`;
    const socket = this.sockets.get(key);

    if (socket) {
      if (callback) {
        socket.off(event, callback);

        // Remove from tracking
        const socketListeners = this.listeners.get(key);
        if (socketListeners && socketListeners.has(event)) {
          socketListeners.get(event)!.delete(callback);
        }
      } else {
        socket.off(event);

        // Remove all listeners for this event from tracking
        const socketListeners = this.listeners.get(key);
        if (socketListeners) {
          socketListeners.delete(event);
        }
      }
    }
  }

  emit(namespace: string, event: string, data?: any, token?: string): void {
    const key = `${namespace}_${token || 'anonymous'}`;
    const socket = this.sockets.get(key);

    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }

  isConnected(namespace: string, token?: string): boolean {
    const key = `${namespace}_${token || 'anonymous'}`;
    const socket = this.sockets.get(key);
    return socket ? socket.connected : false;
  }

  cleanup(): void {
    this.sockets.forEach((socket, key) => {
      const socketListeners = this.listeners.get(key);
      if (socketListeners) {
        socketListeners.forEach((callbacks, event) => {
          callbacks.forEach(callback => {
            socket.off(event, callback);
          });
        });
      }
      socket.disconnect();
    });

    this.sockets.clear();
    this.listeners.clear();
  }
}