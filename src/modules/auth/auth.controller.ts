import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { AuthCookieConstantsCollection } from '../../lib/auth-cookie.constants.ts';
import { AuthCookieOptionsCollection } from '../../lib/auth-cookie-options.ts';
import { authService } from './auth.service.ts';
import type { AuthTypeCollection } from './auth.types.ts';
import type { NextFunction, Request, Response } from 'express';

const signup = async (
  req: Request<object, object, AuthTypeCollection['CreateUserInput']>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, token } = await authService.signup({ input: req.body });
    res.cookie(
      AuthCookieConstantsCollection.name,
      token,
      AuthCookieOptionsCollection.getSetOptions(),
    );
    res.status(201).json({ message: 'User created successfully', data: user });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req: Request<object, object, AuthTypeCollection['LoginInput']['input']>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, token } = await authService.login({ input: req.body });
    res.cookie(
      AuthCookieConstantsCollection.name,
      token,
      AuthCookieOptionsCollection.getSetOptions(),
    );
    res.status(200).json({ message: 'Login successful', data: user });
  } catch (error) {
    next(error);
  }
};

const logout = (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie(
      AuthCookieConstantsCollection.name,
      AuthCookieOptionsCollection.getClearOptions(),
    );
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

const signupBulk = async (
  req: Request<object, object, { users?: AuthTypeCollection['CreateUserInput'][] }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.body.users) {
      throw new ApplicationError({
        message: 'Users are required',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    const users = await authService.signupBulk({ users: req.body.users });
    res.status(201).json({ message: 'Users created successfully', data: users });
  } catch (error) {
    next(error);
  }
};

// ⚠️⬆️⚠️ Write all Auth Routes Handlers above this line
// ✅ All Exports for authController
export const authController = {
  signup,
  signupBulk,
  login,
  logout,
};
