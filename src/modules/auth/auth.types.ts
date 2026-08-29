import type { UserFields } from '../user/user.model.ts';

export type LoginInput = Pick<UserFields, 'email' | 'password'>;

export interface AuthTypeCollection {
  LoginInput: LoginInput;
  CreateUserInputWithPassword: Omit<UserFields, 'createdAt' | 'updatedAt' | 'id' | 'role'>;
  CreateUserInputWithOtp: Omit<AuthTypeCollection['CreateUserInputWithPassword'], 'password'>;
}
