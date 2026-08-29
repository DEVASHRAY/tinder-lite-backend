import type { RequestHandler } from 'express';
import { runWithRequestContext } from '../lib/request-context.ts';

export const requestIdResponseHeader = 'X-Request-Id';

export const requestContextMiddleware: RequestHandler = (_request, response, next): void => {
  runWithRequestContext({
    callback: ({ requestId }) => {
      response.setHeader(requestIdResponseHeader, requestId);
      next();
    },
  });
};
