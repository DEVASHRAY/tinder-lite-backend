import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { User, type UserDocument, type UserFields } from '../user/user.model.ts';
import type { ProfileTypeCollection } from './profile.types.ts';

const getProfileById = async ({ id }: Pick<UserFields, 'id'>) => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApplicationError({
      message: 'User not found',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.NOT_FOUND,
    });
  }

  return user;
};

export const updateProfile = async ({
  user,
  input,
}: {
  user: UserDocument;
  input: ProfileTypeCollection['UpdatableUserFieldsByUser'];
}) => {
  const userAllowedFields: (keyof ProfileTypeCollection['UpdatableUserFieldsByUser'])[] = [
    'name',
    'phoneNumber',
    'gender',
    'age',
    'photoUrl',
  ];

  userAllowedFields.forEach((field) => {
    const value = input[field];
    if (value) {
      user.set(field, value);
    }
  });

  await user.save();
  return user;
};

export const profileService = {
  getProfileById,
  updateProfile,
};
