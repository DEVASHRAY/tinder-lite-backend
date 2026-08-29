import { logger } from '../../lib/logger.ts';
import { Otp, type OtpFields } from './otp.model.ts';

const normalizeEmail = ({ email }: { email: string }) => email.trim().toLowerCase();

const saveOtpByEmail = async ({
  email,
  otpHash,
  expiresAt,
}: Pick<OtpFields, 'email' | 'otpHash' | 'expiresAt'>) => {
  try {
    email = normalizeEmail({ email });
    await Otp.findOneAndUpdate(
      { email }, // 1. dhundo
      { email, otpHash, expiresAt }, // 2. yeh naya data
      { upsert: true }, // 3. na mile to bana do
    );
  } catch (error) {
    logger.fail({ message: 'Failed to save OTP', error });
    throw error;
  }
};

const findOtpByEmail = async ({ email }: Pick<OtpFields, 'email'>) => {
  try {
    return await Otp.findOne({ email: normalizeEmail({ email }) }).select('+otpHash');
  } catch (error) {
    logger.fail({ message: 'Failed to load OTP', error });
    throw error;
  }
};

const deleteOtpByEmail = async ({ email }: Pick<OtpFields, 'email'>) => {
  try {
    await Otp.deleteOne({ email: normalizeEmail({ email }) });
  } catch (error) {
    logger.fail({ message: 'Failed to delete OTP', error });
    throw error;
  }
};

export const otpService = {
  saveOtpByEmail,
  findOtpByEmail,
  deleteOtpByEmail,
};
