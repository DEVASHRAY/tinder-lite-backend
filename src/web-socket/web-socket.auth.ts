import { callbackify } from 'node:util';
import { parseCookie } from 'cookie';
import { ApplicationErrorConstantsCollection } from '../lib/application-error.constants.ts';
import { ApplicationError } from '../lib/application-error.ts';
import { AuthCookieConstantsCollection } from '../lib/auth-cookie.constants.ts';
import { JwtCollection } from '../lib/jwt.ts';
import { logger } from '../lib/logger.ts';
import { User } from '../modules/user/user.model.ts';
import { WebSocketConstantsCollection } from './web-socket.constants.ts';
import type {
  AuthenticateSocketInput,
  CallbackifiedSocketAuthenticator,
  LogAuthenticationRejectionInput,
  RegisterWebSocketAuthenticationInput,
  SocketAuthenticationResult,
} from './web-socket.types.ts';

const getAllowedWebOrigin = (): string => {
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

  return frontendUrl.origin;
};

const decodeCookieValue = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

const authenticateSocket = async ({
  socket,
  allowedWebOrigin,
}: AuthenticateSocketInput): Promise<SocketAuthenticationResult> => {
  let originHeaderCount = 0;

  for (const [index, header] of socket.request.rawHeaders.entries()) {
    if (index % 2 === 0 && header.toLowerCase() === 'origin') {
      originHeaderCount += 1;
    }
  }

  const originHeader = socket.request.headers.origin;

  // Exact Origin validation prevents another website from reusing an authenticated browser's
  // cookies to hijack its WebSocket connection.
  if (originHeaderCount !== 1 || !originHeader) {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Origin,
    };
  }

  let requestOrigin: URL;

  try {
    requestOrigin = new URL(originHeader);
  } catch {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Origin,
    };
  }

  if (
    (requestOrigin.protocol !== 'http:' && requestOrigin.protocol !== 'https:') ||
    requestOrigin.username ||
    requestOrigin.password ||
    requestOrigin.origin !== originHeader ||
    requestOrigin.origin !== allowedWebOrigin
  ) {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Origin,
    };
  }

  // Express cookie-parser only runs for HTTP routes, so a Socket.IO handshake must read and
  // parse its raw Cookie header here.
  const cookieHeader = socket.request.headers.cookie;

  if (!cookieHeader) {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Cookie,
    };
  }

  const cookieName = AuthCookieConstantsCollection.name;
  let authCookieCount = 0;

  for (const cookiePair of cookieHeader.split(';')) {
    const separatorIndex = cookiePair.indexOf('=');
    const candidateName =
      separatorIndex === -1 ? cookiePair.trim() : cookiePair.slice(0, separatorIndex).trim();

    if (candidateName === cookieName) {
      authCookieCount += 1;
    }
  }

  if (authCookieCount !== 1) {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Cookie,
    };
  }

  const cookies = parseCookie(cookieHeader, { decode: decodeCookieValue });
  const token = cookies[cookieName];

  if (typeof token !== 'string' || !token) {
    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Cookie,
    };
  }

  try {
    const accessToken = JwtCollection.verifyAccessToken({ token });

    try {
      const user = await User.findById(accessToken.userId);

      if (!user) {
        return {
          isAuthenticated: false,
          rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.User,
        };
      }

      return {
        isAuthenticated: true,
        authenticatedUserId: accessToken.userId,
      };
    } catch {
      return {
        isAuthenticated: false,
        rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Internal,
      };
    }
  } catch (error) {
    if (
      error instanceof ApplicationError &&
      error.statusCode === ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR
    ) {
      return {
        isAuthenticated: false,
        rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Internal,
      };
    }

    return {
      isAuthenticated: false,
      rejectionReason: WebSocketConstantsCollection.AuthenticationRejectionReason.Token,
    };
  }
};

// Socket.IO uses a `next` callback and does not consume a returned Promise. Node's `callbackify`
// waits for this async lookup and routes an unexpected rejection into the callback below.
const authenticateSocketWithCallback: CallbackifiedSocketAuthenticator =
  callbackify(authenticateSocket);

const logAuthenticationRejection = ({ reason }: LogAuthenticationRejectionInput): void => {
  const detail = `category=${reason}`;

  if (reason === WebSocketConstantsCollection.AuthenticationRejectionReason.Internal) {
    logger.fail({
      message: 'Socket authentication rejected',
      detail,
    });
    return;
  }

  logger.warn({
    message: 'Socket authentication rejected',
    detail,
  });
};

export const registerWebSocketAuthentication = ({
  io,
}: RegisterWebSocketAuthenticationInput): void => {
  const allowedWebOrigin = getAllowedWebOrigin();

  // `io.use` gates every Socket.IO connection before future feature handlers run.
  io.use((socket, next) => {
    authenticateSocketWithCallback({ socket, allowedWebOrigin }, (error, authentication) => {
      if (error || !authentication) {
        logAuthenticationRejection({
          reason: WebSocketConstantsCollection.AuthenticationRejectionReason.Internal,
        });
        next(new Error(WebSocketConstantsCollection.unauthorizedMessage));
        return;
      }

      if (!authentication.isAuthenticated) {
        logAuthenticationRejection({ reason: authentication.rejectionReason });
        // Passing an Error to `next` rejects the handshake as the client's `connect_error`.
        next(new Error(WebSocketConstantsCollection.unauthorizedMessage));
        return;
      }

      // Typed socket.data gives every feature the same server-verified identity.
      socket.data.authenticatedUserId = authentication.authenticatedUserId;
      next();
    });
  });
};
