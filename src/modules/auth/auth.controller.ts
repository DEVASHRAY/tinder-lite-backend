import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { AuthCookieConstantsCollection } from '../../lib/auth-cookie.constants.ts';
import { AuthCookieOptionsCollection } from '../../lib/auth-cookie-options.ts';
import { authOtpService } from './auth-otp.service.ts';
import { authService } from './auth.service.ts';
import type { UserFields } from '../user/user.model.ts';
import type { AuthTypeCollection } from './auth.types.ts';
import type { NextFunction, Request, Response } from 'express';

const sendOtp = async (
  req: Request<object, object, Pick<UserFields, 'email'>>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { wasAlreadySent } = await authOtpService.sendOtp({ email: req.body.email });

    if (wasAlreadySent) {
      res.status(200).json({
        message: 'A valid verification code was already sent. Please use that code',
      });
      return;
    }

    res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (error) {
    next(error);
  }
};

const loginWithOtp = async (
  req: Request<object, object, { otp: string } & Pick<UserFields, 'email'>>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, token } = await authOtpService.loginWithOtp(req.body);
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

const signupWithOtp = async (
  req: Request<object, object, { otp: string } & AuthTypeCollection['CreateUserInputWithOtp']>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, token } = await authOtpService.signupWithOtp(req.body);
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

const signup = async (
  req: Request<object, object, AuthTypeCollection['CreateUserInputWithPassword']>,
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
  req: Request<object, object, AuthTypeCollection['LoginInput']>,
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
  req: Request<object, object, { users?: AuthTypeCollection['CreateUserInputWithPassword'][] }>,
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
  sendOtp,
  loginWithOtp,
  signupWithOtp,
  signup,
  signupBulk,
  login,
  logout,
};
