import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

interface RequestContext {
  requestId: string;
}

interface RunWithRequestContextInput<Result> {
  callback: (context: RequestContext) => Result;
}

interface BindRequestContextInput {
  callback: () => void;
}

// AsyncLocalStorage keeps this value attached to async work started by one request.
// Unlike a global variable, concurrent requests and later awaits cannot overwrite each other.
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string | null => {
  return requestContextStorage.getStore()?.requestId ?? null;
};

export const bindRequestContext = ({ callback }: BindRequestContextInput): (() => void) => {
  const context = requestContextStorage.getStore();

  if (!context) {
    return callback;
  }

  return () => {
    requestContextStorage.run(context, callback);
  };
};

export const runWithRequestContext = <Result>({
  callback,
}: RunWithRequestContextInput<Result>): Result => {
  const context: RequestContext = {
    requestId: randomUUID(),
  };

  return requestContextStorage.run(context, callback, context);
};
