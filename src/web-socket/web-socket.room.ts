import { callbackify } from 'node:util';
import { logger } from '../lib/logger.ts';
import type {
  GetPrivateUserRoomNameInput,
  JoinAuthenticatedSocketToPrivateUserRoomInput,
  RegisterPrivateUserRoomInput,
} from './web-socket.types.ts';

// One server-owned formatter prevents future chat and notification emitters from inventing
// inconsistent room names or targeting an identity supplied by a client.
export const getPrivateUserRoomName = ({
  authenticatedUserId,
}: GetPrivateUserRoomNameInput): string => `user:${authenticatedUserId}`;

const joinAuthenticatedSocketToPrivateUserRoom = async ({
  socket,
}: JoinAuthenticatedSocketToPrivateUserRoomInput): Promise<void> => {
  try {
    // Every tab or device for this trusted identity shares one server-generated room.
    const privateUserRoomName = getPrivateUserRoomName({
      authenticatedUserId: socket.data.authenticatedUserId,
    });
    await socket.join(privateUserRoomName);
  } catch (error) {
    logger.fail({
      message: 'Failed to join authenticated socket to private user room',
      error,
    });
    socket.disconnect(true);
  }
};

// Socket.IO connection listeners do not consume Promises, so callbackify observes completion for
// both the current synchronous adapter and future adapters whose room join is asynchronous.
const joinAuthenticatedSocketToPrivateUserRoomWithCallback = callbackify(
  joinAuthenticatedSocketToPrivateUserRoom,
);

export const registerPrivateUserRoom = ({ io }: RegisterPrivateUserRoomInput): void => {
  // Socket.IO emits `connection` only after every `io.use` authentication middleware calls `next`.
  io.on('connection', (socket) => {
    joinAuthenticatedSocketToPrivateUserRoomWithCallback({ socket }, () => {
      // callbackify requires a completion callback; the async helper owns failure logging and cleanup.
    });
  });
};
