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
    createdAt: Date;
    deliveryAcknowledgementRequired: boolean;
    deliveryStatus: MessageDeliveryStatus | null;
    sentByAuthenticatedUser: boolean;
    sequenceNumber: number;
    textPreview: string;
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
  authenticatedUserId: string;
  items: MessageHistoryItem[];
  nextLastLoadedSequenceNumber: number | null;
  peer: {
    id: string;
    name: string | null;
    photoUrl: string | null;
  };
  readAcknowledgementRequired: boolean;
  readAcknowledgementSequenceNumber: number | null;
}
