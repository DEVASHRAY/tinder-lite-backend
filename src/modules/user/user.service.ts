import mongoose from 'mongoose';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
// Node needs a real file extension in imports (browsers/bundlers often hide this).
// We write `.ts` in source; the compiler turns it into `.js` in the built files.
import { User, type UserFields } from './user.model.ts';
import type { UserTypeCollection } from './user.types.ts';

// Role of `user.service.ts`: "what should the application do?"
// Flow: Route → Controller → Service → Model → Mongo. Response: Mongo → Model → Service → Controller → HTTP.
// This file: business rules and model calls. No `req` / `res`, no status codes, no logger.
// `throw` is not caught here — it goes to the controller `catch`, then error middleware.

const getUserDetails = async ({ id }: Pick<UserFields, 'id'>) => {
  if (!id) {
    throw new ApplicationError({
      message: 'User ID is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApplicationError({
      message: 'Invalid user id',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApplicationError({
      message: 'User not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  return user;
};

const getAllUsers = async () => {
  const users = await User.find();
  return users;
};

const deleteUser = async ({ id }: Pick<UserFields, 'id'>) => {
  if (!id) {
    throw new ApplicationError({
      message: 'User ID is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApplicationError({
      message: 'Invalid user id',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApplicationError({
      message: 'User not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  await user.deleteOne();

  return { message: 'User deleted' };
};

const updateUser = async ({
  id,
  input,
}: Pick<UserFields, 'id'> & {
  input: UserTypeCollection['AdminOnlyUserUpdateInput'];
}) => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApplicationError({
      message: 'User not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  const adminOnlyUserUpdateAllowedFields: (keyof UserTypeCollection['AdminOnlyUserUpdateInput'])[] =
    ['name', 'phoneNumber', 'gender', 'age', 'photoUrl', 'role'];

  adminOnlyUserUpdateAllowedFields.forEach((field) => {
    const value = input[field];
    if (value) {
      user.set(field, value);
    }
  });

  await user.save();

  return user;
};

// ⚠️⬆️⚠️ Write all User Service Functions above this line
// ✅ All Exports for userService
export const userService = {
  getUserDetails,
  getAllUsers,
  deleteUser,
  updateUser,
};
