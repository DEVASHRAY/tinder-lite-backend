import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import validator from 'validator';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { ChatConstantsCollection } from './chat.constants.ts';
import { chatService } from './chat.service.ts';

// The read routes are wired first; their database logic will be added one route at a time.
const getConversations = (_req: Request, response: Response, next: NextFunction) => {
  try {
    const result = chatService.getConversations();

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getMessages = (_req: Request, response: Response, next: NextFunction) => {
  try {
    const result = chatService.getMessages();

    response.status(200).json(result);
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
  getConversations,
  getMessages,
  sendMessage,
};
