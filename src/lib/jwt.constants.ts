// 1 day. The JWT and authentication cookie share this lifetime.
// `jsonwebtoken` `expiresIn` as a number is seconds, so sign uses this / 1000.
const accessTokenExpirationMs = 1000 * 60 * 60 * 24;

export const JwtConstantsCollection = {
  accessTokenExpirationMs,
};
