import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import validator from 'validator';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { JwtCollection } from '../../lib/jwt.ts';
import { logger } from '../../lib/logger.ts';
import { SesCollection } from '../../lib/ses.ts';
import { OtpConstantsCollection } from '../otp/otp.constants.ts';
import { otpService } from '../otp/otp.service.ts';
import { createUserInstance } from '../user/user.create.ts';
import { User, type UserFields } from '../user/user.model.ts';
import { AuthConstantsCollection } from './auth.constants.ts';
import type { AuthTypeCollection } from './auth.types.ts';

const normalizeEmail = ({ email }: { email: string }) => email.trim().toLowerCase();

const createIncorrectOtpError = () => {
  return new ApplicationError({
    message: AuthConstantsCollection.incorrectOtpMessage,
    statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
  });
};

const createExpiredOtpError = () => {
  return new ApplicationError({
    message: AuthConstantsCollection.expiredOtpMessage,
    statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
  });
};

const sendOtp = async ({ email }: Pick<UserFields, 'email'>) => {
  try {
    if (!email || !validator.isEmail(email)) {
      throw new ApplicationError({
        message: 'Please enter a valid email address',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
      });
    }

    email = normalizeEmail({ email });
    const existingOtp = await otpService.findOtpByEmail({ email });

    if (existingOtp && existingOtp.expiresAt.getTime() > Date.now()) {
      return { wasAlreadySent: true };
    }

    // `randomInt` is Node's cryptographically strong random. `Math.random` is not safe for codes.
    const otp = String(
      randomInt(OtpConstantsCollection.otpMin, OtpConstantsCollection.otpMaxExclusive),
    );
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + OtpConstantsCollection.otpExpirationMs);

    await otpService.saveOtpByEmail({
      email,
      otpHash,
      expiresAt,
    });

    const expiresInMinutes = String(OtpConstantsCollection.otpExpirationMs / (1000 * 60));

    await SesCollection.sendEmail({
      to: email,
      subject: AuthConstantsCollection.otpEmailSubject,
      text: `Your ${AuthConstantsCollection.productName} verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    });

    return { wasAlreadySent: false };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    logger.fail({ message: 'Failed to send OTP', error });

    if (error instanceof Error) {
      throw new ApplicationError({
        message: 'Failed to send OTP',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }

    throw error;
  }
};

const verifyOtp = async ({ email, otp }: { otp: string } & Pick<UserFields, 'email'>) => {
  try {
    if (!email || !otp) {
      throw createIncorrectOtpError();
    }

    if (otp.length !== OtpConstantsCollection.otpLength || !validator.isNumeric(otp)) {
      throw createIncorrectOtpError();
    }

    const otpRecord = await otpService.findOtpByEmail({ email });

    if (!otpRecord) {
      throw createExpiredOtpError();
    }

    const otpHash = otpRecord.otpHash;

    if (!otpHash) {
      throw createIncorrectOtpError();
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await otpService.deleteOtpByEmail({ email: otpRecord.email });
      throw createExpiredOtpError();
    }

    const isOtpValid = await argon2.verify(otpHash, otp);

    if (!isOtpValid) {
      throw createIncorrectOtpError();
    }

    return { email: otpRecord.email };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    logger.fail({ message: 'Failed to verify OTP', error });

    if (error instanceof Error) {
      throw new ApplicationError({
        message: 'Failed to verify OTP',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }

    throw error;
  }
};

const loginWithOtp = async (input: { otp: string } & Pick<UserFields, 'email'>) => {
  try {
    const { email } = await verifyOtp(input);
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      throw new ApplicationError({
        message: 'No account for this email',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
      });
    }

    await otpService.deleteOtpByEmail({ email });
    const token = JwtCollection.generateAccessToken({ userId: existingUser.id });
    return { user: existingUser, token };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    logger.fail({ message: 'Failed to log in with OTP', error });

    if (error instanceof Error) {
      throw new ApplicationError({
        message: 'Failed to log in with OTP',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }

    throw error;
  }
};

const signupWithOtp = async (
  input: { otp: string } & AuthTypeCollection['CreateUserInputWithOtp'],
) => {
  try {
    const { email } = await verifyOtp({ email: input.email, otp: input.otp });
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ApplicationError({
        message: 'Email already exists',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
      });
    }

    const user = createUserInstance({
      ...input,
      email,
    });
    await user.validate();

    try {
      await user.save();
    } catch (error) {
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
        throw new ApplicationError({
          message: 'Email already exists',
          statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
          cause: error,
        });
      }

      throw error;
    }

    await otpService.deleteOtpByEmail({ email });
    const token = JwtCollection.generateAccessToken({ userId: user.id });
    return { user, token };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    logger.fail({ message: 'Failed to sign up with OTP', error });

    if (error instanceof Error) {
      throw new ApplicationError({
        message: 'Failed to sign up with OTP',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }

    throw error;
  }
};

export const authOtpService = {
  sendOtp,
  loginWithOtp,
  signupWithOtp,
};
