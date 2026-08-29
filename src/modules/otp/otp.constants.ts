const otpLength = 6;
const otpMin = 100000;
const otpMaxExclusive = 1000000;

// 1000ms = 1 second
// 1000 * 60 = 1 minute
const otpExpirationMinutes = 10;
const otpExpirationMs = 1000 * 60 * otpExpirationMinutes;

export const OtpConstantsCollection = {
  otpLength,
  otpMin,
  otpMaxExclusive,
  otpExpirationMinutes,
  otpExpirationMs,
};
