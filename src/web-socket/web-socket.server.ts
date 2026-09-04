import { Server as SocketServer } from 'socket.io';
import { registerWebSocketAuthentication } from './web-socket.auth.ts';
import { WebSocketConstantsCollection } from './web-socket.constants.ts';
import { registerWebSocketExpiry } from './web-socket.expiry.ts';
import { registerPrivateUserRoom } from './web-socket.room.ts';
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
    // Engine.IO sends a ping every 25 seconds and allows 20 seconds for the pong.
    pingInterval: WebSocketConstantsCollection.heartbeatPingIntervalMs,
    pingTimeout: WebSocketConstantsCollection.heartbeatPingTimeoutMs,
    // 16 KiB bounds one inbound packet while leaving ample room around 2,000-character text.
    maxHttpBufferSize: WebSocketConstantsCollection.maximumPacketSizeBytes,
    serveClient: false,
    transports: ['websocket'],
  });

  registerWebSocketAuthentication({ io });
  registerWebSocketExpiry({ io });
  registerPrivateUserRoom({ io });

  return io;
};
