import type { CookieOptions } from 'express';
import { AuthCookieConstantsCollection } from './auth-cookie.constants.ts';
import { JwtConstantsCollection } from './jwt.constants.ts';

const getSharedOptions = (): CookieOptions => {
  return {
    httpOnly: true,
    path: AuthCookieConstantsCollection.path,
    sameSite: AuthCookieConstantsCollection.SameSite.Lax,
    // Local development runs over HTTP. Production must use HTTPS before the browser accepts this cookie.
    secure: process.env['NODE_ENV'] === 'production',
  };
};

const getSetOptions = (): CookieOptions => {
  return {
    ...getSharedOptions(),
    maxAge: JwtConstantsCollection.accessTokenExpirationMs,
  };
};

const getClearOptions = (): CookieOptions => {
  return getSharedOptions();
};

export const AuthCookieOptionsCollection = {
  getSetOptions,
  getClearOptions,
};
