import type { AuthTypeCollection } from '../auth/auth.types.ts';
import { UserConstantsCollection } from './user.constants.ts';
import { User } from './user.model.ts';

interface CreateUserInstanceInput {
  input:
    | AuthTypeCollection['CreateUserInputWithPassword']
    | AuthTypeCollection['CreateUserInputWithOtp'];
}

// Never pass `req.body` into `new User(...)`. Extra keys like `role` would be copied.
// Only the fields below are set; role is always USER.
export const createUserInstance = ({ input }: CreateUserInstanceInput) => {
  const user = new User({
    name: input.name,
    email: input.email,
    gender: input.gender,
    age: input.age,
    role: UserConstantsCollection.UserRole.USER,
    isSeededProfile: input.isSeededProfile ?? false,
  });

  if ('password' in input && input.password) {
    user.password = input.password;
  }

  if (input.phoneNumber) {
    user.phoneNumber = input.phoneNumber;
  }

  if (input.photoUrl) {
    user.photoUrl = input.photoUrl;
  }

  if (input.birthDate) {
    user.birthDate = input.birthDate;
  }

  if (input.bio) {
    user.bio = input.bio;
  }

  if (input.jobTitle) {
    user.jobTitle = input.jobTitle;
  }

  if (input.photos.length) {
    user.photos = input.photos;
  }

  if (input.location?.city) {
    user.location = { city: input.location.city };
  }

  if (input.interestedIn.length) {
    user.interestedIn = input.interestedIn;
  }

  user.preferences = input.preferences;

  if (input.life) {
    user.life = input.life;
  }

  return user;
};
