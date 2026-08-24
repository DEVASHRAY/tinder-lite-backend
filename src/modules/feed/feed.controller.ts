import type { NextFunction, Request, Response } from 'express';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { feedService } from './feed.service.ts';

const getFeed = async (
  req: Request<object, object, object, { page?: string; limit?: string }>,
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

    const feedUsers = await feedService.getFeed({
      user: req.user,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 10, 50),
    });

    res.status(200).json({
      message: 'Feed users fetched successfully',
      data: feedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const feedController = {
  getFeed,
};
