import type { ApplicationErrorTypeCollection } from './application-error.types.ts';

export class ApplicationError extends Error {
  readonly statusCode: ApplicationErrorTypeCollection['Input']['statusCode'];

  constructor({ message, statusCode, cause }: ApplicationErrorTypeCollection['Input']) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
  }
}
