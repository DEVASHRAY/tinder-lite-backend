import { callbackify } from 'node:util';
import { ApplicationError } from '../../lib/application-error.ts';
import { logger } from '../../lib/logger.ts';
import { getPrivateUserRoomName, io } from '../web-socket.ts';
import { ChatSocketConstantsCollection } from './chat-socket.constants.ts';
import type { MessageCreatedPayload, MessageReceiptPayload } from './chat-socket.types.ts';

interface MessageReceiptInput extends MessageReceiptPayload {
  authenticatedUserId: string;
}

interface MessageReceiptUpdateResult {
  wasUpdated: boolean;
  otherParticipantUserId: string;
}

interface RegisterChatWebSocketHandlersInput {
  markMessagesDelivered: (input: MessageReceiptInput) => Promise<MessageReceiptUpdateResult>;
  markMessagesRead: (input: MessageReceiptInput) => Promise<MessageReceiptUpdateResult>;
}

interface EmitMessageCreatedInput {
  senderUserId: string;
  recipientUserId: string;
  payload: MessageCreatedPayload;
}

export const registerChatWebSocketHandlers = ({
  markMessagesDelivered,
  markMessagesRead,
}: RegisterChatWebSocketHandlersInput): void => {
  const processMessageDelivered = async (input: MessageReceiptInput): Promise<void> => {
    try {
      const result = await markMessagesDelivered(input);

      if (!result.wasUpdated) {
        return;
      }

      try {
        const otherParticipantRoom = getPrivateUserRoomName({
          authenticatedUserId: result.otherParticipantUserId,
        });

        // The other participant's devices update every outgoing Message through this sequence.
        io.to(otherParticipantRoom).emit(
          ChatSocketConstantsCollection.ServerToClientEvent.MESSAGE_DELIVERED,
          {
            conversationId: input.conversationId,
            sequenceNumber: input.sequenceNumber,
          },
        );
      } catch (error) {
        // MongoDB is already updated, so a realtime fanout failure must not undo the receipt.
        logger.warn({ message: 'Failed to emit message.delivered event', error });
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        logger.warn({ message: 'Socket message-delivered acknowledgement rejected', error });
        return;
      }

      logger.fail({ message: 'Failed to mark socket messages as delivered', error });
    }
  };
  // Socket.IO does not await listener Promises; Node's `callbackify` exposes completion via callback.
  const processMessageDeliveredWithCallback = callbackify(processMessageDelivered);

  const processMessageRead = async (input: MessageReceiptInput): Promise<void> => {
    try {
      const result = await markMessagesRead(input);

      if (!result.wasUpdated) {
        return;
      }

      try {
        const otherParticipantRoom = getPrivateUserRoomName({
          authenticatedUserId: result.otherParticipantUserId,
        });

        // The other participant's devices turn outgoing Messages through this sequence blue/read.
        io.to(otherParticipantRoom).emit(
          ChatSocketConstantsCollection.ServerToClientEvent.MESSAGE_READ,
          {
            conversationId: input.conversationId,
            sequenceNumber: input.sequenceNumber,
          },
        );
      } catch (error) {
        // MongoDB is already updated, so a realtime fanout failure must not undo the receipt.
        logger.warn({ message: 'Failed to emit message.read event', error });
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        logger.warn({ message: 'Socket message-read acknowledgement rejected', error });
        return;
      }

      logger.fail({ message: 'Failed to mark socket messages as read', error });
    }
  };
  const processMessageReadWithCallback = callbackify(processMessageRead);

  // Socket.IO emits `connection` only after the shared authentication middleware accepts the socket.
  io.on('connection', (socket) => {
    socket.on(ChatSocketConstantsCollection.ClientToServerEvent.MESSAGE_DELIVERED, (payload) => {
      try {
        processMessageDeliveredWithCallback(
          {
            authenticatedUserId: socket.data.authenticatedUserId,
            conversationId: payload.conversationId,
            sequenceNumber: payload.sequenceNumber,
          },
          () => {
            // The async wrapper handles failures; this callback only observes its completion.
          },
        );
      } catch (error) {
        logger.fail({ message: 'Failed to process message.delivered event', error });
      }
    });

    socket.on(ChatSocketConstantsCollection.ClientToServerEvent.MESSAGE_READ, (payload) => {
      try {
        processMessageReadWithCallback(
          {
            authenticatedUserId: socket.data.authenticatedUserId,
            conversationId: payload.conversationId,
            sequenceNumber: payload.sequenceNumber,
          },
          () => {
            // The async wrapper handles failures; this callback only observes its completion.
          },
        );
      } catch (error) {
        logger.fail({ message: 'Failed to process message.read event', error });
      }
    });
  });
};

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
    io.to([senderRoom, recipientRoom]).emit(
      ChatSocketConstantsCollection.ServerToClientEvent.MESSAGE_CREATED,
      payload,
    );
  } catch {
    // Realtime delivery is best-effort after storage; a committed HTTP send must still succeed.
    logger.warn({ message: 'Failed to emit message.created event' });
  }
};
