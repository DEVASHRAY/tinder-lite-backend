import mongoose, { model, Schema, type InferSchemaType } from 'mongoose';
import validator from 'validator';
import { ChatConstantsCollection } from './chat.constants.ts';

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      immutable: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    content: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      maxlength: [
        ChatConstantsCollection.messageTextMaxLength,
        `Message must be at most ${String(
          ChatConstantsCollection.messageTextMaxLength,
        )} characters`,
      ],
    },
    // The frontend reuses this UUID when retrying the same logical message.
    clientMessageId: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      trim: true,
      minlength: ChatConstantsCollection.clientMessageIdLength,
      maxlength: ChatConstantsCollection.clientMessageIdLength,
      validate: {
        validator: (value: string) => validator.isUUID(value, 4),
        message: '{VALUE} is not a valid UUID v4 client message ID',
      },
    },
    // The server allocates this position from Conversation.lastSequenceNumber.
    sequenceNumber: {
      type: Number,
      required: true,
      immutable: true,
      min: 1,
      validate: ChatConstantsCollection.safeIntegerValidator,
    },
  },
  {
    // Messages cannot be edited in the first release, so only creation time is stored.
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
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

messageSchema.index({ conversationId: 1, sequenceNumber: 1 }, { unique: true });

messageSchema.index({ conversationId: 1, senderId: 1, clientMessageId: 1 }, { unique: true });

export type MessageFieldsType = InferSchemaType<typeof messageSchema> & {
  id: string;
};

export type MessageDocument = mongoose.HydratedDocumentFromSchema<typeof messageSchema>;

export const Message = model('Message', messageSchema);
