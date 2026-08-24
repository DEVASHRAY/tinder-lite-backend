import type { NextFunction, Request, Response } from 'express';
import { ApplicationErrorConstantsCollection } from '../lib/application-error.constants.ts';
import { ApplicationError } from '../lib/application-error.ts';
import { UserConstantsCollection } from '../modules/user/user.constants.ts';

// After authMiddleware. Only an admin may hit routes that change another user's data.
export const adminMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    if (req.user.role !== UserConstantsCollection.UserRole.ADMIN) {
      throw new ApplicationError({
        message: 'Forbidden',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.FORBIDDEN,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
