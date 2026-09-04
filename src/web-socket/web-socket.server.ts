import { Server as SocketServer } from 'socket.io';
import { registerWebSocketAuthentication } from './web-socket.auth.ts';
import type {
  AuthenticatedSocketData,
  ClientToServerEvents,
  CreateWebSocketServerInput,
  InterServerEvents,
  ServerToClientEvents,
  WebSocketServer,
} from './web-socket.types.ts';

export const createWebSocketServer = ({
  httpServer,
}: CreateWebSocketServerInput): WebSocketServer => {
  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    AuthenticatedSocketData
  >(httpServer, {
    serveClient: false,
    transports: ['websocket'],
  });

  registerWebSocketAuthentication({ io });

  return io;
};
