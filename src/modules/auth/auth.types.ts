import type { UserFields } from '../user/user.model.ts';

export type LoginInput = Pick<UserFields, 'email' | 'password'>;

type OptionalCreateUserField =
  'interestedIn' | 'isSeededProfile' | 'photos' | 'photoUrl' | 'preferences';

type CreateUserInputWithPassword = Omit<
  UserFields,
  'createdAt' | 'updatedAt' | 'id' | 'role' | OptionalCreateUserField
> &
  Partial<Pick<UserFields, OptionalCreateUserField>>;

export interface AuthTypeCollection {
  LoginInput: LoginInput;
  CreateUserInputWithPassword: CreateUserInputWithPassword;
  CreateUserInputWithOtp: Omit<AuthTypeCollection['CreateUserInputWithPassword'], 'password'>;
}
