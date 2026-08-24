// `import type` is erased at compile time — TypeScript uses the type, the built JS does not import it for values.
import type { NextFunction, Request, Response } from 'express';
import { ApplicationErrorConstantsCollection } from '../lib/application-error.constants.ts';
import { ApplicationError } from '../lib/application-error.ts';
import { AuthCookieConstantsCollection } from '../lib/auth-cookie.constants.ts';
import { JwtCollection } from '../lib/jwt.ts';
import { User } from '../modules/user/user.model.ts';

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const cookieName = AuthCookieConstantsCollection.name;

    if (typeof req.cookies[cookieName] !== 'string' || !req.cookies[cookieName]) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    const accessToken = JwtCollection.verifyAccessToken({ token: req.cookies[cookieName] });

    // Find User by ID
    const user = await User.findById(accessToken.userId);

    if (!user) {
      throw new ApplicationError({
        message: 'Unauthorized',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    // Put the user on `req` so the next handler (protected route) can read `req.user`.
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
