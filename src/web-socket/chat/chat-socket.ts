import { logger } from '../../lib/logger.ts';
import { getPrivateUserRoomName, io } from '../web-socket.ts';
import { ChatSocketConstantsCollection } from './chat-socket.constants.ts';
import type { MessageCreatedPayload } from './chat-socket.types.ts';

interface EmitMessageCreatedInput {
  senderUserId: string;
  recipientUserId: string;
  payload: MessageCreatedPayload;
}

export const emitMessageCreated = ({
  senderUserId,
  recipientUserId,
  payload,
}: EmitMessageCreatedInput): void => {
  try {
    const senderRoom = getPrivateUserRoomName({
      authenticatedUserId: senderUserId,
    });
    const recipientRoom = getPrivateUserRoomName({
      authenticatedUserId: recipientUserId,
    });

    // One union emit to `user:sender` and `user:recipient` reaches all of both users' tabs/devices.
    // Empty rooms are a normal no-op while MongoDB remains the durable source of truth.
    io
      .to([senderRoom, recipientRoom])
      .emit(ChatSocketConstantsCollection.ServerToClientEvent.MESSAGE_CREATED, payload);
  } catch {
    // Realtime delivery is best-effort after storage; a committed HTTP send must still succeed.
    logger.warn({ message: 'Failed to emit message.created event' });
  }
};
