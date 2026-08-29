import argon2 from 'argon2';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { JwtCollection } from '../../lib/jwt.ts';
import { User } from '../user/user.model.ts';
import { createUserInstance } from '../user/user.create.ts';
import type { AuthTypeCollection } from './auth.types.ts';
import { AuthConstantsCollection } from './auth.constants.ts';
import { UserConstantsCollection } from '../user/user.constants.ts';
import mongoose from 'mongoose';

const createUser = async ({
  input,
}: {
  input: AuthTypeCollection['CreateUserInputWithPassword'];
}) => {
  if (!input.email || !input.password) {
    throw new ApplicationError({
      message: 'Email and password are required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const existingUser = await User.findOne({ email: input.email });

  if (existingUser) {
    throw new ApplicationError({
      message: 'Email already exists',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
    });
  }

  const user = createUserInstance(input);
  // Schema rules run on the typed password (and the rest of the document). Nothing is written yet.
  await user.validate();
  // Replace the typed password with an Argon2 hash. We cannot get the original back.
  user.password = await argon2.hash(input.password);

  try {
    // Skip schema checks on save so minlength / isStrongPassword do not run on the generated hash.
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    // Unique email index: two signups at once can both pass findOne, then Mongo
    // rejects the second write with code 11000. Same meaning as "Email already exists".
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      throw new ApplicationError({
        message: 'Email already exists',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
        cause: error,
      });
    }
    throw error;
  }

  return user;
};

const signup = async ({ input }: { input: AuthTypeCollection['CreateUserInputWithPassword'] }) => {
  const user = await createUser({ input });
  const token = JwtCollection.generateAccessToken({ userId: user.id });

  return { user, token };
};

const signupBulk = async ({
  users,
}: {
  users: AuthTypeCollection['CreateUserInputWithPassword'][];
}) => {
  if (!users.length) {
    throw new ApplicationError({
      message: 'Users are required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  if (users.length > AuthConstantsCollection.maxBulkSignupCount) {
    throw new ApplicationError({
      message: 'Too many users',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const createdUsers = [];

  for (const input of users) {
    const user = await createUser({ input });
    createdUsers.push(user);
  }

  return createdUsers;
};

const login = async ({ input }: { input: AuthTypeCollection['LoginInput'] }) => {
  if (!input.email || !input.password) {
    throw new ApplicationError({
      message: 'Invalid email or password',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
    });
  }

  if (
    !input.password ||
    input.password.length < UserConstantsCollection.strongPasswordValidationOptions.minLength ||
    input.password.length > UserConstantsCollection.userPasswordMaxLength
  ) {
    throw new ApplicationError({
      message: 'Invalid email or password',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
    });
  }

  // `select: false` on password: we must ask for the hash to verify it.
  const user = await User.findOne({ email: input.email }).select('+password');

  if (!user?.password) {
    throw new ApplicationError({
      message: 'Invalid email or password',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
    });
  }

  // Reads salt + hash from the stored string; compares to what they typed.
  const isPasswordValid = await argon2.verify(user.password, input.password);

  if (!isPasswordValid) {
    throw new ApplicationError({
      message: 'Invalid email or password',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNAUTHORIZED,
    });
  }

  // Generate access token
  const token = JwtCollection.generateAccessToken({ userId: user.id });

  return { user, token };
};

// ⚠️⬆️⚠️ Write all Auth Services above this line
// ✅ All Exports for authService

export const authService = { login, signup, signupBulk };
