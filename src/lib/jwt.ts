import jwt from 'jsonwebtoken';
import { ApplicationErrorConstantsCollection } from './application-error.constants.ts';
import { ApplicationError } from './application-error.ts';
import { JwtConstantsCollection } from './jwt.constants.ts';
import type { JwtTypeCollection } from './jwt.types.ts';

const getJwtSecret = () => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) {
    throw new ApplicationError({
      message: 'JWT_SECRET is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return jwtSecret;
};

const isAccessToken = (
  value: string | jwt.JwtPayload,
): value is JwtTypeCollection['AccessToken'] => {
  if (typeof value === 'string') {
    return false;
  }

  if (!('userId' in value)) {
    return false;
  }

  return typeof value['userId'] === 'string';
};

const generateAccessToken = ({ userId }: JwtTypeCollection['AccessToken']) => {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: JwtConstantsCollection.accessTokenExpirationMs / 1000,
  });
};

const verifyAccessToken = ({ token }: { token: string }) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!isAccessToken(decoded)) {
      throw new ApplicationError({
        message: 'Invalid access token',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
      });
    }

    return decoded;
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApplicationError({
        message: 'Invalid or expired access token',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
        cause: error,
      });
    }

    throw error;
  }
};

export const JwtCollection = {
  generateAccessToken,
  verifyAccessToken,
};
