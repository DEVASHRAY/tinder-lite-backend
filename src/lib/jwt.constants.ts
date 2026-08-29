// 2 hours. Same millisecond formula as cookie `maxAge`.
// `jsonwebtoken` `expiresIn` as a number is seconds, so sign uses this / 1000.
const accessTokenExpirationMs = 1000 * 60 * 60 * 2;

export const JwtConstantsCollection = {
  accessTokenExpirationMs,
};
