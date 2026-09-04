// `import type` reuses the runtime enum's proven values without adding a JavaScript import.
import type { ChatConstantsCollection } from './chat.constants.ts';

export type MessageDeliveryStatus =
  (typeof ChatConstantsCollection.MessageDeliveryStatus)[keyof typeof ChatConstantsCollection.MessageDeliveryStatus];

export interface ConversationInboxItem {
  conversationId: string;
  connectionId: string;
  peer: {
    id: string;
    name: string | null;
    photoUrl: string | null;
  };
  lastMessage: {
    textPreview: string;
    createdAt: Date;
    sentByAuthenticatedUser: boolean;
    deliveryStatus: MessageDeliveryStatus | null;
  };
  unreadCount: number;
}

export interface MessageHistoryItem {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  clientMessageId: string;
  sequenceNumber: number;
  createdAt: Date;
  deliveryStatus: MessageDeliveryStatus | null;
}

export interface MessageHistoryResponse {
  items: MessageHistoryItem[];
  nextLastLoadedSequenceNumber: number | null;
}
