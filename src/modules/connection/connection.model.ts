import mongoose, { model, Schema, type InferSchemaType } from 'mongoose';
import { ConnectionConstantsCollection } from './connection.constant.ts';

const connectionSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // Min of the two user ids by string order. With maxUserId this is one unordered pair.
    minUserId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    // Max of the two user ids by string order. A→B and B→A share the same min/max pair.
    maxUserId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: Object.values(ConnectionConstantsCollection.CONNECTION_STATUS_ENUM),
        message: '{VALUE} is not a valid connection status',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (
        _doc,
        ret: {
          _id?: mongoose.Types.ObjectId;
          minUserId?: mongoose.Types.ObjectId;
          maxUserId?: mongoose.Types.ObjectId;
        },
      ) => {
        delete ret._id;
        delete ret.minUserId;
        delete ret.maxUserId;
        return ret;
      },
    },
  },
);

connectionSchema.index({ minUserId: 1, maxUserId: 1 }, { unique: true });
connectionSchema.index({ senderId: 1, status: 1 });
connectionSchema.index({ receiverId: 1, status: 1 });

export type ConnectionFieldsType = InferSchemaType<typeof connectionSchema> & {
  id: string;
};

export type ConnectionDocument = mongoose.HydratedDocumentFromSchema<typeof connectionSchema>;

export const Connection = model('Connection', connectionSchema);
