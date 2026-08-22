import mongoose from 'mongoose';
import { User, type UserDocument } from '../user/user.model.ts';
import { ConnectionConstantsCollection } from './connection.constant.ts';
import { Connection, type ConnectionDocument } from './connection.model.ts';
import { getMinMaxUserIds } from './connection.pair.ts';
import type { ConnectionTypeCollection } from './connection.types.ts';

const createConnection = async ({
  user,
  receiverId,
  status,
}: {
  user: UserDocument;
  receiverId: string;
  status: ConnectionTypeCollection['CreateConnectionAllowedStatusType'];
}) => {
  // Check if the sender and receiver are the same
  if (user.id === receiverId) {
    throw new Error('Sender and receiver cannot be the same');
  }

  // Check if the status is allowed
  if (!ConnectionConstantsCollection.CreateConnectionAllowedStatus.includes(status)) {
    throw new Error('Invalid connection status');
  }

  // Find the receiver user
  const receiverUser = await User.findById(receiverId);

  if (!receiverUser) {
    throw new Error('Receiver user not found');
  }

  // A→B and B→A must hit the same unique pair, not two directed rows.
  const { minUserId, maxUserId } = getMinMaxUserIds({
    senderId: user.id,
    receiverId,
  });

  // $and = both fields must match (same as writing { minUserId, maxUserId } without $and).
  const connection = await Connection.findOne({
    $and: [{ minUserId }, { maxUserId }],
  });

  if (connection) {
    throw new Error('Connection already exists');
  }

  try {
    const newConnection = await Connection.create({
      senderId: user.id,
      receiverId,
      minUserId,
      maxUserId,
      status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM[status],
    });

    return newConnection;
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      throw new Error('Connection already exists', { cause: error });
    }
    throw error;
  }
};

const updateConnection = async ({
  connectionId,
  status,
  user,
}: {
  user: UserDocument;
  connectionId: string;
  status: ConnectionTypeCollection['UpdateConnectionAllowedStatusType'];
}) => {
  if (!ConnectionConstantsCollection.UpdateConnectionAllowedStatus.includes(status)) {
    throw new Error('Invalid connection status');
  }

  const connection = await Connection.findById(connectionId);

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!connection.receiverId.equals(user.id)) {
    throw new Error('You are not authorized to update this connection');
  }

  if (connection.status !== ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.INTERESTED) {
    throw new Error(`Connection cannot be updated to ${status} status`);
  }

  connection.status = status;

  await connection.save();

  return connection;
};

const getConnections = async ({
  user,
  connectionType,
}: {
  user: UserDocument;
  connectionType: ConnectionTypeCollection['ConnectionListType'];
}) => {
  let connections: ConnectionDocument[];

  switch (connectionType) {
    case 'matches': {
      connections = await Connection.find({
        status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.ACCEPTED,
        $or: [{ senderId: user.id }, { receiverId: user.id }],
      });
      break;
    }
    case 'sent': {
      connections = await Connection.find({
        status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.INTERESTED,
        $or: [{ senderId: user.id }],
      });
      break;
    }

    case 'received': {
      connections = await Connection.find({
        status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.INTERESTED,
        $or: [{ receiverId: user.id }],
      });
      break;
    }

    case 'ignored': {
      connections = await Connection.find({
        status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.IGNORED,
        $or: [{ senderId: user.id }, { receiverId: user.id }],
      });
      break;
    }

    case 'rejected': {
      connections = await Connection.find({
        status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.REJECTED,
        $or: [{ senderId: user.id }, { receiverId: user.id }],
      });
      break;
    }

    default: {
      throw new Error('Invalid Status');
    }
  }

  await Connection.populate(connections, [
    { path: 'senderId', select: ConnectionConstantsCollection.connectionUserSelect },
    { path: 'receiverId', select: ConnectionConstantsCollection.connectionUserSelect },
  ]);

  return connections.map((connection) => {
    if (user.id === connection.senderId.id.toString()) {
      return connection.receiverId.toJSON();
    }

    return connection.senderId.toJSON();
  });
};

export const connectionService = {
  createConnection,
  updateConnection,
  getConnections,
};
