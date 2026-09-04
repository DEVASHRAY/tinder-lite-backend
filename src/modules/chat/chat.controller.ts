import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import validator from 'validator';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { ChatConstantsCollection } from './chat.constants.ts';
import { chatService } from './chat.service.ts';

// The read routes are wired first; their database logic will be added one route at a time.
const getConversationInbox = async (
  request: Request<object, object, object, { cursor?: string }>,
  response: Response,
  next: NextFunction,
) => {
  try {
    if (!request.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    const { cursor } = request.query;

    const result = await chatService.getConversationInbox({
      userId: request.user.id,
      ...(cursor ? { cursor } : {}),
    });

    response.status(200).json({
      message: 'Conversation inbox fetched',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMessageHistory = async (
  request: Request<{ connectionId: string }, object, object, { lastLoadedSequenceNumber?: string }>,
  response: Response,
  next: NextFunction,
) => {
  try {
    if (!request.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (!request.params.connectionId) {
      throw new ApplicationError({
        message: 'Connection ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(request.params.connectionId)) {
      throw new ApplicationError({
        message: 'Connection ID is invalid',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const lastLoadedSequenceNumberQuery = request.query.lastLoadedSequenceNumber;
    let lastLoadedSequenceNumber: number | undefined;

    if (lastLoadedSequenceNumberQuery) {
      // Query values arrive as text; Number parses the full value before the safe-integer check.
      const parsedLastLoadedSequenceNumber = Number(lastLoadedSequenceNumberQuery);

      if (
        !Number.isSafeInteger(parsedLastLoadedSequenceNumber) ||
        parsedLastLoadedSequenceNumber <= 0
      ) {
        throw new ApplicationError({
          message: 'Last loaded sequence number must be a positive safe integer',
          statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
        });
      }

      lastLoadedSequenceNumber = parsedLastLoadedSequenceNumber;
    } else if ('lastLoadedSequenceNumber' in request.query) {
      throw new ApplicationError({
        message: 'Last loaded sequence number must be a positive safe integer',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const result = lastLoadedSequenceNumber
      ? await chatService.getMessageHistory({
          userId: request.user.id,
          connectionId: request.params.connectionId,
          lastLoadedSequenceNumber,
        })
      : await chatService.getMessageHistory({
          userId: request.user.id,
          connectionId: request.params.connectionId,
        });

    response.status(200).json({
      message: 'Messages fetched',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (
  request: Request<{ connectionId: string }, object, { text: string; clientMessageId: string }>,
  response: Response,
  next: NextFunction,
) => {
  try {
    // Auth middleware normally sets this, but keep the controller safe if its mounting changes.
    if (!request.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (!request.params.connectionId) {
      throw new ApplicationError({
        message: 'Connection ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    // Reject malformed IDs before they reach an accepted-connection database query.
    if (!mongoose.Types.ObjectId.isValid(request.params.connectionId)) {
      throw new ApplicationError({
        message: 'Connection ID is invalid',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    // Validate the trimmed value so whitespace-only messages cannot be saved.
    if (typeof request.body.text !== 'string' || !request.body.text.trim()) {
      throw new ApplicationError({
        message: 'Message should be in a string format',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const text = request.body.text.trim();

    if (text.length > ChatConstantsCollection.messageTextMaxLength) {
      throw new ApplicationError({
        message: `Message must be at most ${String(
          ChatConstantsCollection.messageTextMaxLength,
        )} characters`,
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    // Reusing this frontend-generated UUID lets the service detect a retried message.
    if (
      typeof request.body.clientMessageId !== 'string' ||
      !validator.isUUID(request.body.clientMessageId.trim(), 4)
    ) {
      throw new ApplicationError({
        message: 'Client message ID must be a valid UUID v4',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const result = await chatService.sendMessage({
      userId: request.user.id,
      connectionId: request.params.connectionId,
      text,
      clientMessageId: request.body.clientMessageId.trim(),
    });

    response.status(result.created ? 201 : 200).json({
      message: result.created ? 'Message sent' : 'Message already sent',
      data: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const chatController = {
  getConversationInbox,
  getMessageHistory,
  sendMessage,
};
