// `import type` is erased at compile time — TypeScript uses the type, the built JS does not import it for values.
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApplicationErrorConstantsCollection } from '../lib/application-error.constants.ts';
import { ApplicationError } from '../lib/application-error.ts';
import { logger } from '../lib/logger.ts';

// Express only treats a function as error middleware if it has 4 arguments
// (the error, the request, the response, and next). `_request` is unused; it must
// still be listed so Express sees 4 parameters.
// Register this last in `app.ts`. Failed routes call `next(error)` so they land here.
// This is the only place that logs a request failure and sends an error JSON body.
export const errorMiddleware = (
  error: Error,
  _request: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.fail({ message: 'Request failed', error });

  // `headersSent` means we already wrote a response (`res.json` / `res.send`).
  // Writing again throws "Cannot set headers after they are sent".
  // This function is last in *our* `app.ts`, so `next(error)` does not run another
  // file we wrote. It goes to Express's built-in final error handler, which will
  // not send a second body. Controllers normally `next(error)` *before* sending,
  // so this branch almost never runs.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApplicationError) {
    const message =
      error.statusCode === ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : error.message;

    res.status(error.statusCode).json({ message });
    return;
  }

  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    res
      .status(ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY)
      .json({ message: error.message });
    return;
  }

  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    res
      .status(ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT)
      .json({ message: 'Resource already exists' });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === ApplicationErrorConstantsCollection.HttpStatusCode.BAD_REQUEST &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res
      .status(ApplicationErrorConstantsCollection.HttpStatusCode.BAD_REQUEST)
      .json({ message: 'Invalid JSON request body' });
    return;
  }

  if (error.message === 'request entity too large') {
    res
      .status(ApplicationErrorConstantsCollection.HttpStatusCode.PAYLOAD_TOO_LARGE)
      .json({ message: 'Request body is too large' });
    return;
  }

  res
    .status(ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR)
    .json({ message: 'Internal server error' });
};
