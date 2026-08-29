import type { UserFields } from '../user/user.model.ts';

export type LoginInput = Pick<UserFields, 'email' | 'password'>;

type CreateUserInputWithPassword = Omit<
  UserFields,
  'createdAt' | 'updatedAt' | 'id' | 'role' | 'isSeededProfile'
> &
  Partial<Pick<UserFields, 'isSeededProfile'>>;

export interface AuthTypeCollection {
  LoginInput: LoginInput;
  CreateUserInputWithPassword: CreateUserInputWithPassword;
  CreateUserInputWithOtp: Omit<AuthTypeCollection['CreateUserInputWithPassword'], 'password'>;
}
