import type { ChatSocketConstantsCollection } from './chat-socket.constants.ts';

export interface MessageCreatedPayload {
  conversationId: string;
  connectionId: string;
  id: string;
  senderId: string;
  text: string;
  clientMessageId: string;
  sequenceNumber: number;
  // MongoDB uses Date internally; the Socket.IO wire contract carries an ISO-8601 string.
  createdAt: string;
}

// This map type-checks the publisher used by the HTTP send path after transaction commit.
export interface ChatServerToClientEvents {
  [ChatSocketConstantsCollection.ServerToClientEvent.MESSAGE_CREATED]: (
    payload: MessageCreatedPayload,
  ) => void;
}
