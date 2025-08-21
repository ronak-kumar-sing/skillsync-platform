import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface SocketOptions {
  namespace?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  clearError: () => void;
}

export function useSocket(options: SocketOptions = {}): UseSocketReturn {
  const {
    namespace = '/',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const { user, isAuthenticated } = useAuth();

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    if (!user || !isAuthenticated) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    const socketUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      : 'http://localhost:3000';

    const socket = io(`${socketUrl}${namespace}`, {
      auth: { token },
      autoConnect: false,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log(`Socket connected to ${namespace}:`, socket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected from ${namespace}:`, reason);
      setIsConnected(false);
      setIsConnecting(false);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`Socket connection error for ${namespace}:`, err);
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected to ${namespace} after ${attemptNumber} attempts`);
      setError(null);
    });

    socket.on('reconnect_error', (err) => {
      console.error(`Socket reconnection error for ${namespace}:`, err);
      setError(`Reconnection error: ${err.message}`);
    });

    socket.on('reconnect_failed', () => {
      console.error(`Socket failed to reconnect to ${namespace}`);
      setError('Failed to reconnect to server');
      setIsConnecting(false);
    });

    // Authentication events
    socket.on('auth_error', (data) => {
      console.error(`Socket authentication error for ${namespace}:`, data);
      setError(`Authentication error: ${data.message}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    // Auto-connect if enabled
    if (autoConnect) {
      setIsConnecting(true);
      socket.connect();
    }

    return () => {
      // Remove all listeners
      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socket.off(event, callback);
        });
      });
      listenersRef.current.clear();

      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, isAuthenticated, namespace, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);

  // Connect manually
  const connect = useCallback(() => {
    if (socketRef.current && !isConnected && !isConnecting) {
      setIsConnecting(true);
      setError(null);
      socketRef.current.connect();
    }
  }, [isConnected, isConnecting]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.disconnect();
    }
  }, [isConnected]);

  // Emit event
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: socket not connected`);
    }
  }, [isConnected]);

  // Add event listener
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socketRef.current) return;

    // Track listeners for cleanup
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    socketRef.current.on(event, callback);
  }, []);

  // Remove event listener
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (!socketRef.current) return;

    if (callback) {
      socketRef.current.off(event, callback);

      // Remove from tracking
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    } else {
      // Remove all listeners for this event
      socketRef.current.off(event);
      listenersRef.current.delete(event);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    clearError,
  };
}

/**
 * Hook for collaboration namespace
 */
export function useCollaborationSocket(options: Omit<SocketOptions, 'namespace'> = {}) {
  return useSocket({ ...options, namespace: '/collaboration' });
}

/**
 * Hook for matching namespace
 */
export function useMatchingSocket(options: Omit<SocketOptions, 'namespace'> = {}) {
  return useSocket({ ...options, namespace: '/matching' });
}

/**
 * Hook for queue namespace (already exists, but keeping for consistency)
 */
export function useQueueSocket(options: Omit<SocketOptions, 'namespace'> = {}) {
  return useSocket({ ...options, namespace: '/queue' });
}