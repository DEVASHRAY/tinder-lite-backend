import type { NextFunction, Request, Response } from 'express';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import type { UserFields } from '../user/user.model.ts';
import { profileService } from './profile.service.ts';
import type { ProfileTypeCollection } from './profile.types.ts';

const getProfile = (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!_req.user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    res.status(200).json({ message: 'Profile fetched', data: _req.user });
  } catch (error) {
    next(error);
  }
};

const getProfileById = async (
  req: Request<Pick<UserFields, 'id'>>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.params.id) {
      throw new ApplicationError({
        message: 'User ID is required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const profile = await profileService.getProfileById({ id: req.params.id });

    res.status(200).json({ message: 'Profile fetched', data: profile });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (
  req: Request<object, object, ProfileTypeCollection['UpdatableUserFieldsByUser']>,
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

    const profile = await profileService.updateProfile({ user: req.user, input: req.body });

    res.status(200).json({ message: 'Profile updated', data: profile });
  } catch (error) {
    next(error);
  }
};

export const profileController = {
  getProfile,
  getProfileById,
  updateProfile,
};
