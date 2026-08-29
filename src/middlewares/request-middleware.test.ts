import assert from 'node:assert/strict';
import { request as sendHttpRequest, type Server } from 'node:http';
import test, { type TestContext } from 'node:test';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { getRequestId } from '../lib/request-context.ts';
import { logger, type LoggerMessageInput } from '../lib/logger.ts';
import { requestAccessMiddleware } from './request-access-middleware.ts';
import { requestContextMiddleware, requestIdResponseHeader } from './request-context-middleware.ts';

interface StartedServer {
  origin: string;
  server: Server;
}

interface StartServerInput {
  app: Application;
}

interface CloseServerInput {
  server: Server;
}

interface WaitInput {
  durationMs: number;
}

interface CapturedLog {
  detail: string;
  message: string;
  requestId: string | null;
}

interface CapturedLogs {
  fail: CapturedLog[];
  success: CapturedLog[];
  warn: CapturedLog[];
}

interface CaptureLogInput {
  destination: CapturedLog[];
  input: LoggerMessageInput;
}

interface InstallLogCaptureInput {
  testContext: TestContext;
}

interface CreateTestErrorInput<Thrown> {
  error: Thrown;
  message: string;
}

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const wait = ({ durationMs }: WaitInput): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const createTestError = <Thrown>({ error, message }: CreateTestErrorInput<Thrown>): Error => {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }

  return new Error(message);
};

const captureLog = ({ destination, input }: CaptureLogInput): void => {
  destination.push({
    detail: input.detail ?? '',
    message: input.message,
    requestId: getRequestId(),
  });
};

const installLogCapture = ({ testContext }: InstallLogCaptureInput): CapturedLogs => {
  const logs: CapturedLogs = {
    fail: [],
    success: [],
    warn: [],
  };

  testContext.mock.method(logger, 'fail', (input: LoggerMessageInput): void => {
    captureLog({ destination: logs.fail, input });
  });
  testContext.mock.method(logger, 'success', (input: LoggerMessageInput): void => {
    captureLog({ destination: logs.success, input });
  });
  testContext.mock.method(logger, 'warn', (input: LoggerMessageInput): void => {
    captureLog({ destination: logs.warn, input });
  });

  return logs;
};

const createTestApp = (): Application => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(requestAccessMiddleware);

  app.get('/ok', (_request, response) => {
    response.status(204).end();
  });
  app.get('/client-error', (_request, response) => {
    response.status(422).json({ message: 'Expected client error' });
  });
  app.get('/server-error', () => {
    throw new Error('Expected server error');
  });
  app.get<{ delayMs: string }>('/context/:delayMs', async (request, response) => {
    try {
      await wait({ durationMs: Number(request.params.delayMs) });
      const requestId = getRequestId();

      if (!requestId) {
        throw new Error('Request context is missing');
      }

      response.setHeader('X-Observed-Request-Id', requestId).status(200).end();
    } catch (error) {
      throw createTestError({ error, message: 'Request context route failed' });
    }
  });
  app.get('/abort', (_request, response) => {
    response.write('partial');
    const timeout = setTimeout(() => {
      if (!response.destroyed) {
        response.end('late');
      }
    }, 250);

    response.once('close', () => {
      clearTimeout(timeout);
    });
  });

  app.use((error: Error, _request: Request, response: Response, next: NextFunction): void => {
    if (response.headersSent) {
      next(error);
      return;
    }

    response.status(500).json({ message: 'Expected server error' });
  });

  return app;
};

const startServer = async ({ app }: StartServerInput): Promise<StartedServer> => {
  try {
    const server = await new Promise<Server>((resolve, reject) => {
      const onError = (error: Error): void => {
        reject(error);
      };
      const listeningServer = app.listen(0, () => {
        listeningServer.off('error', onError);
        resolve(listeningServer);
      });
      listeningServer.once('error', onError);
    });
    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Test server did not bind to a TCP port');
    }

    return {
      origin: `http://127.0.0.1:${String(address.port)}`,
      server,
    };
  } catch (error) {
    throw createTestError({ error, message: 'Starting the test server failed' });
  }
};

const closeServer = async ({ server }: CloseServerInput): Promise<void> => {
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch (error) {
    throw createTestError({ error, message: 'Closing the test server failed' });
  }
};

try {
  // Top-level await lets Node finish registering each test before this module exits.
  await test('response IDs and compact access logs cover success, errors, and 404s', async (testContext) => {
    const logs = installLogCapture({ testContext });

    try {
      const { origin, server } = await startServer({ app: createTestApp() });

      try {
        const successResponse = await fetch(`${origin}/ok?secret=must-not-appear`, {
          headers: { 'X-Request-Id': 'client-supplied-id' },
        });
        await successResponse.text();
        const clientErrorResponse = await fetch(`${origin}/client-error`);
        await clientErrorResponse.text();
        const serverErrorResponse = await fetch(`${origin}/server-error`);
        await serverErrorResponse.text();
        const notFoundResponse = await fetch(`${origin}/not-found`);
        await notFoundResponse.text();
        await wait({ durationMs: 10 });

        assert.equal(successResponse.status, 204);
        assert.equal(clientErrorResponse.status, 422);
        assert.equal(serverErrorResponse.status, 500);
        assert.equal(notFoundResponse.status, 404);
        assert.notEqual(successResponse.headers.get(requestIdResponseHeader), 'client-supplied-id');

        for (const response of [
          successResponse,
          clientErrorResponse,
          serverErrorResponse,
          notFoundResponse,
        ]) {
          const responseRequestId = response.headers.get(requestIdResponseHeader);
          assert.ok(responseRequestId);
          assert.match(responseRequestId, requestIdPattern);
        }

        assert.equal(logs.success.length, 1);
        assert.equal(logs.warn.length, 2);
        assert.equal(logs.fail.length, 1);

        const allLogs = [...logs.success, ...logs.warn, ...logs.fail];
        const allDetails = allLogs.map(({ detail }) => detail).join('\n');
        assert.equal(allLogs.length, 4);
        for (const log of allLogs) {
          assert.ok(log.requestId);
          assert.match(log.requestId, requestIdPattern);
        }
        assert.equal(new Set(allLogs.map(({ requestId }) => requestId)).size, 4);
        assert.match(logs.success[0]?.detail ?? '', /method=GET path=\/ok status=204/);
        assert.match(logs.warn[0]?.detail ?? '', /status=(?:404|422)/);
        assert.match(logs.warn[1]?.detail ?? '', /status=(?:404|422)/);
        assert.match(logs.fail[0]?.detail ?? '', /path=\/server-error status=500/);
        assert.match(allDetails, /durationMs=\d+\.\d{2}/);
        assert.doesNotMatch(allDetails, /client-supplied-id|secret|must-not-appear|\?/);
        assert.ok(allLogs.every(({ message }) => message === 'HTTP request completed'));
      } finally {
        await closeServer({ server });
      }
    } catch (error) {
      throw createTestError({ error, message: 'Access log response coverage test failed' });
    }
  });

  await test('concurrent HTTP requests retain separate IDs through awaits', async (testContext) => {
    installLogCapture({ testContext });

    try {
      const { origin, server } = await startServer({ app: createTestApp() });

      try {
        const [slowResponse, fastResponse] = await Promise.all([
          fetch(`${origin}/context/20`),
          fetch(`${origin}/context/1`),
        ]);
        await Promise.all([slowResponse.text(), fastResponse.text()]);

        const slowResponseId = slowResponse.headers.get(requestIdResponseHeader);
        const fastResponseId = fastResponse.headers.get(requestIdResponseHeader);
        assert.ok(slowResponseId);
        assert.ok(fastResponseId);
        assert.equal(slowResponse.headers.get('X-Observed-Request-Id'), slowResponseId);
        assert.equal(fastResponse.headers.get('X-Observed-Request-Id'), fastResponseId);
        assert.notEqual(slowResponseId, fastResponseId);
      } finally {
        await closeServer({ server });
      }
    } catch (error) {
      throw createTestError({ error, message: 'Concurrent HTTP request context test failed' });
    }
  });

  await test('aborted responses produce exactly one safe completion warning', async (testContext) => {
    const logs = installLogCapture({ testContext });

    try {
      const { origin, server } = await startServer({ app: createTestApp() });

      try {
        await new Promise<void>((resolve, reject) => {
          const clientRequest = sendHttpRequest(`${origin}/abort`, (incomingResponse) => {
            incomingResponse.once('error', reject);
            incomingResponse.once('data', () => {
              incomingResponse.destroy();
              resolve();
            });
          });

          clientRequest.once('error', reject);
          clientRequest.end();
        });
        await wait({ durationMs: 50 });

        assert.equal(logs.success.length, 0);
        assert.equal(logs.fail.length, 0);
        assert.equal(logs.warn.length, 1);
        const [warning] = logs.warn;
        assert.ok(warning);
        assert.equal(warning.message, 'HTTP request aborted');
        assert.match(warning.requestId ?? '', requestIdPattern);
        assert.match(warning.detail, /path=\/abort .* outcome=aborted/);
        assert.match(warning.detail, /durationMs=\d+\.\d{2}/);
      } finally {
        await closeServer({ server });
      }
    } catch (error) {
      throw createTestError({ error, message: 'Aborted HTTP request test failed' });
    }
  });
} catch (error) {
  throw createTestError({ error, message: 'Request middleware test registration failed' });
}
