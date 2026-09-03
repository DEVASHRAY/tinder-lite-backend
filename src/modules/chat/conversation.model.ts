import mongoose, { model, Schema, type InferSchemaType } from 'mongoose';
import { ChatConstantsCollection } from './chat.constants.ts';
import { ConversationUtilsCollection } from './conversation.utils.ts';

// Tracks which messages this participant has received and read.
const participantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: 'User',
    },
    lastDeliveredSequenceNumber: ChatConstantsCollection.nonNegativeSafeIntegerField,
    lastReadSequenceNumber: ChatConstantsCollection.nonNegativeSafeIntegerField,
    // Stored so the inbox does not count unread Messages on every request.
    unreadCount: ChatConstantsCollection.nonNegativeSafeIntegerField,
  },
  {
    _id: false,
  },
);

// Message remains the source of truth; this bounded copy makes inbox reads inexpensive.
const lastMessageSchema = new Schema(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Message',
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    textPreview: {
      type: String,
      required: true,
      trim: true,
      maxlength: [
        ChatConstantsCollection.lastMessagePreviewMaxLength,
        `Message preview must be at most ${String(
          ChatConstantsCollection.lastMessagePreviewMaxLength,
        )} characters`,
      ],
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const conversationSchema = new Schema(
  {
    connectionId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: 'Connection',
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator: (participants: { userId: mongoose.Types.ObjectId }[]) =>
          ConversationUtilsCollection.participantsValidator({
            userIds: participants.map((participant) => participant.userId),
          }),
        message: 'Conversation must have exactly two distinct participants',
      },
    },
    // Message-send code atomically increments this counter to allocate Message.sequence.
    lastSequenceNumber: ChatConstantsCollection.nonNegativeSafeIntegerField,
    lastMessage: {
      type: lastMessageSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: { _id?: mongoose.Types.ObjectId }) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

export type ConversationFieldsType = InferSchemaType<typeof conversationSchema> & {
  id: string;
};

conversationSchema.index({ connectionId: 1 }, { unique: true });

conversationSchema.index({
  'participants.userId': 1,
  'lastMessage.createdAt': -1,
  _id: -1,
});

export type ConversationDocument = mongoose.HydratedDocumentFromSchema<typeof conversationSchema>;

export const Conversation = model('Conversation', conversationSchema);
