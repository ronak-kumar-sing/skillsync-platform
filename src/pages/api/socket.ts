import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocketServer } from '@/lib/socket-server';

// Extend NextApiResponse to include socket server
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');

    const httpServer = res.socket.server;
    const io = initializeSocketServer(httpServer);

    res.socket.server.io = io;

    console.log('Socket.io server initialized successfully');
  } else {
    console.log('Socket.io server already initialized');
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};