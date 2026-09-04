import type { Server as HttpServer } from 'node:http';
import type { Server as SocketServer, Socket } from 'socket.io';
import type { WebSocketConstantsCollection } from './web-socket.constants.ts';

export type ClientToServerEvents = Record<never, never>;
export type ServerToClientEvents = Record<never, never>;
export type InterServerEvents = Record<never, never>;

export type AuthenticationRejectionReason =
  (typeof WebSocketConstantsCollection.AuthenticationRejectionReason)[keyof typeof WebSocketConstantsCollection.AuthenticationRejectionReason];

export interface AuthenticatedSocketData {
  accessTokenExpiresAtMs: number;
  authenticatedUserId: string;
}

export interface CreateWebSocketServerInput {
  httpServer: HttpServer;
}

export type WebSocketServer = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>;

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>;

export interface GetPrivateUserRoomNameInput {
  authenticatedUserId: string;
}

export interface JoinAuthenticatedSocketToPrivateUserRoomInput {
  socket: AuthenticatedSocket;
}

export interface RegisterPrivateUserRoomInput {
  io: WebSocketServer;
}

export interface RegisterWebSocketExpiryInput {
  io: WebSocketServer;
}

export type SocketAuthenticationResult =
  | {
      isAuthenticated: true;
      accessTokenExpiresAtMs: number;
      authenticatedUserId: string;
    }
  | {
      isAuthenticated: false;
      rejectionReason: AuthenticationRejectionReason;
    };

export interface AuthenticateSocketInput {
  socket: AuthenticatedSocket;
  allowedWebOrigin: string;
}

export type SocketAuthenticationCallback = (
  error: Error | null,
  authentication?: SocketAuthenticationResult,
) => void;

export type CallbackifiedSocketAuthenticator = (
  input: AuthenticateSocketInput,
  callback: SocketAuthenticationCallback,
) => void;

export interface RegisterWebSocketAuthenticationInput {
  io: WebSocketServer;
}

export interface LogAuthenticationRejectionInput {
  reason: AuthenticationRejectionReason;
}
