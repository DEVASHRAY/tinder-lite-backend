const otpLength = 6;
const otpMin = 100000;
const otpMaxExclusive = 1000000;

// 1000ms = 1 second
// 1000 * 60 = 1 minute
// 1000 * 60 * 10 = 10 minutes
const otpExpirationMs = 1000 * 60 * 10;

export const OtpConstantsCollection = {
  otpLength,
  otpMin,
  otpMaxExclusive,
  otpExpirationMs,
};
