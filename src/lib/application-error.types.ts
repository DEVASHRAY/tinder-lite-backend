import type { ApplicationErrorConstantsCollection } from './application-error.constants.ts';

type HttpStatusCode =
  (typeof ApplicationErrorConstantsCollection.HttpStatusCode)[keyof typeof ApplicationErrorConstantsCollection.HttpStatusCode];

export interface ApplicationErrorTypeCollection {
  Input: {
    message: string;
    statusCode: HttpStatusCode;
    cause?: Error;
  };
}
