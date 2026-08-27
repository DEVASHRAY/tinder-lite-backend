import mongoose from 'mongoose';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
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
    throw new ApplicationError({
      message: 'Sender and receiver cannot be the same',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  // Check if the status is allowed
  if (!ConnectionConstantsCollection.CreateConnectionAllowedStatus.includes(status)) {
    throw new ApplicationError({
      message: 'Invalid connection status',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  // Find the receiver user
  const receiverUser = await User.findById(receiverId);

  if (!receiverUser) {
    throw new ApplicationError({
      message: 'Receiver user not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
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
    throw new ApplicationError({
      message: 'Connection already exists',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
    });
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
      throw new ApplicationError({
        message: 'Connection already exists',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
        cause: error,
      });
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
    throw new ApplicationError({
      message: 'Invalid connection status',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const connection = await Connection.findById(connectionId);

  if (!connection) {
    throw new ApplicationError({
      message: 'Connection not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  if (!connection.receiverId.equals(user.id)) {
    throw new ApplicationError({
      message: 'You are not authorized to update this connection',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.FORBIDDEN,
    });
  }

  if (connection.status !== ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.INTERESTED) {
    throw new ApplicationError({
      message: `Connection cannot be updated to ${status} status`,
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
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
      throw new ApplicationError({
        message: 'Invalid connection type',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }
  }

  await Connection.populate(connections, [
    { path: 'senderId', select: ConnectionConstantsCollection.connectionUserSelect },
    { path: 'receiverId', select: ConnectionConstantsCollection.connectionUserSelect },
  ]);

  return connections.map((connection) => {
    const viewerIsSender = user.id === connection.senderId.id.toString();
    const peer = viewerIsSender ? connection.receiverId : connection.senderId;

    return {
      connectionId: connection.id,
      profile: peer.toJSON(),
    };
  });
};

const getPeerConnection = async ({
  peerUserId,
  user,
}: {
  peerUserId: string;
  user: UserDocument;
}) => {
  if (user.id === peerUserId) {
    throw new ApplicationError({
      message: 'Cannot look up a connection with yourself',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const { minUserId, maxUserId } = getMinMaxUserIds({
    senderId: user.id,
    receiverId: peerUserId,
  });

  const connection = await Connection.findOne({
    $and: [{ minUserId }, { maxUserId }],
  });

  if (!connection) {
    throw new ApplicationError({
      message: 'Connection not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  return {
    connectionId: connection.id,
    status: connection.status,
    viewerRole: connection.receiverId.equals(user.id)
      ? ConnectionConstantsCollection.CONNECTION_VIEWER_ROLE.Receiver
      : ConnectionConstantsCollection.CONNECTION_VIEWER_ROLE.Sender,
  };
};

export const connectionService = {
  createConnection,
  updateConnection,
  getConnections,
  getPeerConnection,
};
