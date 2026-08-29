import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.ts';
import { bindRequestContext } from '../lib/request-context.ts';

interface WriteAccessLogInput {
  aborted: boolean;
  durationMs: string;
  method: string;
  pathname: string;
  statusCode: number;
}

interface CompleteRequestInput {
  aborted: boolean;
}

interface SanitizePathnameInput {
  pathname: string;
}

interface ResponseEventHandlers {
  close?: () => void;
  finish?: () => void;
}

const sanitizePathname = ({ pathname }: SanitizePathnameInput): string => {
  return pathname.replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll('\t', '%09');
};

const writeAccessLog = ({
  aborted,
  durationMs,
  method,
  pathname,
  statusCode,
}: WriteAccessLogInput): void => {
  const outcome = aborted ? 'aborted' : 'completed';
  const message = aborted ? 'HTTP request aborted' : 'HTTP request completed';
  const detail = `method=${method} path=${pathname} status=${String(statusCode)} durationMs=${durationMs} outcome=${outcome}`;

  if (aborted) {
    logger.warn({ message, detail });
    return;
  }

  if (statusCode >= 500) {
    logger.fail({ message, detail });
    return;
  }

  if (statusCode >= 400) {
    logger.warn({ message, detail });
    return;
  }

  logger.success({ message, detail });
};

export const requestAccessMiddleware: RequestHandler = (request, response, next): void => {
  const method = request.method;
  const pathname = sanitizePathname({ pathname: request.path });
  // `performance.now()` is Node's monotonic timer, so wall-clock changes cannot skew durations.
  const startedAt = performance.now();
  let wasLogged = false;
  const handlers: ResponseEventHandlers = {};

  const cleanup = (): void => {
    if (handlers.close) {
      response.off('close', handlers.close);
    }

    if (handlers.finish) {
      response.off('finish', handlers.finish);
    }
  };

  const completeRequest = ({ aborted }: CompleteRequestInput): void => {
    if (wasLogged) {
      return;
    }

    wasLogged = true;
    cleanup();

    writeAccessLog({
      aborted,
      durationMs: Math.max(0, performance.now() - startedAt).toFixed(2),
      method,
      pathname,
      statusCode: response.statusCode,
    });
  };

  // Response events may fire after this middleware returns, so bind them to this request's async state.
  const finishHandler = bindRequestContext({
    callback: () => {
      completeRequest({ aborted: false });
    },
  });
  const closeHandler = bindRequestContext({
    callback: () => {
      completeRequest({ aborted: !response.writableFinished });
    },
  });
  handlers.finish = finishHandler;
  handlers.close = closeHandler;

  response.once('finish', finishHandler);
  response.once('close', closeHandler);
  next();
};
