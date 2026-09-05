import { callbackify } from 'node:util';
import type { Server as HttpServer } from 'node:http';
import { parseCookie } from 'cookie';
import { Server as SocketServer } from 'socket.io';
import { AuthCookieConstantsCollection } from '../lib/auth-cookie.constants.ts';
import { JwtCollection } from '../lib/jwt.ts';
import { logger } from '../lib/logger.ts';
import { User } from '../modules/user/user.model.ts';
import type {
  ChatClientToServerEvents,
  ChatServerToClientEvents,
} from './chat/chat-socket.types.ts';

interface AuthenticatedSocketData {
  accessTokenExpiresAtMs: number;
  authenticatedUserId: string;
}

interface GetPrivateUserRoomNameInput {
  authenticatedUserId: string;
}

interface AttachWebSocketServerInput {
  httpServer: HttpServer;
}

export const getPrivateUserRoomName = ({
  authenticatedUserId,
}: GetPrivateUserRoomNameInput): string => `user:${authenticatedUserId}`;

// Importers share this same instance. Constructing it does not open a port; startup attaches it below.
export const io = new SocketServer<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  Record<never, never>,
  AuthenticatedSocketData
>({
  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 16_384,
  serveClient: false,
  transports: ['websocket'],
});

export const attachWebSocketServer = ({ httpServer }: AttachWebSocketServerInput): void => {
  // 1. Normalize the one trusted HTTP(S) browser origin at startup.
  const configuredOrigin = process.env['ALLOWED_WEB_ORIGIN'];

  if (!configuredOrigin) {
    throw new Error('ALLOWED_WEB_ORIGIN is required');
  }

  let frontendUrl: URL;

  try {
    frontendUrl = new URL(configuredOrigin);
  } catch {
    throw new Error('ALLOWED_WEB_ORIGIN must be a valid HTTP or HTTPS URL');
  }

  if (
    (frontendUrl.protocol !== 'http:' && frontendUrl.protocol !== 'https:') ||
    frontendUrl.username ||
    frontendUrl.password
  ) {
    throw new Error('ALLOWED_WEB_ORIGIN must be a valid HTTP or HTTPS URL');
  }

  const allowedWebOrigin = frontendUrl.origin;

  // 2. This middleware runs during the handshake, before Socket.IO emits `connection`.
  // `next()` accepts it; `next(error)` rejects it and the client receives `connect_error`.
  io.use((socket, next) => {
    // Trust identity only from the browser-sent HttpOnly cookie, never a client payload:
    // `Origin: https://app.example` must match, then `Cookie: <auth-cookie>=<JWT>` is verified.
    // Socket.IO/EventEmitter callbacks do not await Promises, so `callbackify` observes the
    // asynchronous User lookup here and the asynchronous private-room join below.
    const authenticateSocketWithCallback = callbackify(async (): Promise<boolean> => {
      try {
        if (socket.request.headers.origin !== allowedWebOrigin) {
          return false;
        }

        const cookieHeader = socket.request.headers.cookie;

        if (!cookieHeader) {
          return false;
        }

        const token = parseCookie(cookieHeader)[AuthCookieConstantsCollection.name];

        if (!token) {
          return false;
        }

        const accessToken = JwtCollection.verifyAccessToken({ token });
        const accessTokenExpirationTimeSeconds = accessToken.exp;

        if (
          typeof accessTokenExpirationTimeSeconds !== 'number' ||
          !Number.isSafeInteger(accessTokenExpirationTimeSeconds) ||
          accessTokenExpirationTimeSeconds <= 0
        ) {
          return false;
        }

        const accessTokenExpiresAtMs = accessTokenExpirationTimeSeconds * 1000;

        if (
          !Number.isSafeInteger(accessTokenExpiresAtMs) ||
          accessTokenExpiresAtMs - Date.now() <= 0
        ) {
          return false;
        }

        const user = await User.findById(accessToken.userId);

        if (!user) {
          return false;
        }

        socket.data.accessTokenExpiresAtMs = accessTokenExpiresAtMs;
        socket.data.authenticatedUserId = accessToken.userId;
        return true;
      } catch {
        return false;
      }
    });

    authenticateSocketWithCallback((_error, isAuthenticated) => {
      if (!isAuthenticated) {
        logger.warn({ message: 'Socket authentication rejected' });
        next(new Error('Unauthorized'));
        return;
      }

      next();
    });
  });

  // 3. `connection` means this socket is already authenticated and connected; this block only
  // initializes that connected socket's expiry cleanup and personal delivery room.
  io.on('connection', (socket) => {
    const initializeConnectedSocketWithCallback = callbackify(async (): Promise<void> => {
      try {
        // A socket cannot outlive its JWT: a token expiring at 3:00 PM disconnects at 3:00 PM.
        const expirationTimer = setTimeout(() => {
          socket.disconnect(true);
        }, socket.data.accessTokenExpiresAtMs - Date.now());

        // If the client disconnects at 2:55 PM, remove the now-unneeded 3:00 PM timer.
        socket.once('disconnect', () => {
          clearTimeout(expirationTimer);
        });

        // `user:<id>` is one personal room shared by this user's tabs/devices, not a Conversation.
        await socket.join(
          getPrivateUserRoomName({
            authenticatedUserId: socket.data.authenticatedUserId,
          }),
        );
      } catch (error) {
        logger.fail({ message: 'Failed to initialize authenticated socket', error });
        socket.disconnect(true);
      }
    });

    initializeConnectedSocketWithCallback(() => {
      // Completion is observed here; the async initializer owns safe failure handling.
    });
  });

  // 4. Attach the shared Socket.IO instance to the same HTTP server used by Express.
  io.attach(httpServer);
};
