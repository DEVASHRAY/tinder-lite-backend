import type { NextFunction, Request, Response } from 'express';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { connectionService } from './connection.service.ts';
import type { ConnectionTypeCollection } from './connection.types.ts';

const createConnection = async (
  req: Request<
    object,
    object,
    { receiverId?: string; status?: ConnectionTypeCollection['CreateConnectionAllowedStatusType'] }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, body } = req;
    // Check if the user is authenticated
    if (!user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    // Check if the receiver ID is provided
    if (!body.receiverId) {
      throw new ApplicationError({
        message: 'Receiver ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    // Check if the status is provided
    if (!body.status) {
      throw new ApplicationError({
        message: 'Status is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    // Call the connection service to create the connection
    const connection = await connectionService.createConnection({
      user,
      receiverId: body.receiverId,
      status: body.status,
    });

    // Return the response received from the connection service
    res.status(201).json({ message: 'Connection created', data: connection });
  } catch (error) {
    next(error);
  }
};

const updateConnection = async (
  req: Request<
    { connectionId?: string },
    object,
    { status?: ConnectionTypeCollection['UpdateConnectionAllowedStatusType'] }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, body, params } = req;

    if (!user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (!params.connectionId) {
      throw new ApplicationError({
        message: 'Connection ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    if (!body.status) {
      throw new ApplicationError({
        message: 'Status is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const updatedConnection = await connectionService.updateConnection({
      user,
      connectionId: params.connectionId,
      status: body.status,
    });

    res.status(200).json({ message: 'Connection updated', data: updatedConnection });
  } catch (error) {
    next(error);
  }
};

const getConnections = async (
  req: Request<
    object,
    object,
    object,
    { connectionType?: ConnectionTypeCollection['ConnectionListType'] }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, query } = req;

    if (!user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (!query.connectionType) {
      throw new ApplicationError({
        message: 'Connection type is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const connections = await connectionService.getConnections({
      user,
      connectionType: query.connectionType,
    });

    res.status(200).json({ message: 'Connections fetched', data: connections });
  } catch (error) {
    next(error);
  }
};

const getPeerConnection = async (
  req: Request<{ userId?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (!req.params.userId) {
      throw new ApplicationError({
        message: 'User ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const peerConnection = await connectionService.getPeerConnection({
      peerUserId: req.params.userId,
      user: req.user,
    });

    res.status(200).json({ message: 'Connection fetched', data: peerConnection });
  } catch (error) {
    next(error);
  }
};

export const connectionController = {
  getConnections,
  getPeerConnection,
  updateConnection,
  createConnection,
};
