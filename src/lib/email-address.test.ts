import assert from 'node:assert/strict';
import test from 'node:test';
import { maskEmailAddress } from './email-address.ts';

interface CreateTestErrorInput<Thrown> {
  error: Thrown;
  message: string;
}

const createTestError = <Thrown>({ error, message }: CreateTestErrorInput<Thrown>): Error => {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }

  return new Error(message);
};

try {
  // Top-level await lets Node finish registering each test before this module exits.
  await test('email masking keeps only a partial local prefix', () => {
    const email = '27person@gmail.com';
    const maskedEmail = maskEmailAddress({ email });

    assert.equal(maskedEmail, '27***@gmail.com');
    assert.notEqual(maskedEmail, email);
    assert.doesNotMatch(maskedEmail, /27person/);
  });

  await test('email masking never reveals a complete short local part', () => {
    assert.equal(maskEmailAddress({ email: 'a@gmail.com' }), '***@gmail.com');
    assert.equal(maskEmailAddress({ email: 'ab@gmail.com' }), 'a***@gmail.com');
    assert.equal(maskEmailAddress({ email: 'invalid' }), '***');
  });
} catch (error) {
  throw createTestError({ error, message: 'Email masking test registration failed' });
}
