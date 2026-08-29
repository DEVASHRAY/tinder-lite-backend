import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { getRequestId, runWithRequestContext } from './request-context.ts';

interface WaitInput {
  durationMs: number;
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

try {
  // Top-level await lets Node finish registering each test before this module exits.
  await test('request context generates a UUID and survives awaits', async () => {
    try {
      const result = await runWithRequestContext({
        callback: async ({ requestId }) => {
          try {
            const beforeAwait = getRequestId();
            await wait({ durationMs: 5 });
            return { afterAwait: getRequestId(), beforeAwait, requestId };
          } catch (error) {
            throw createTestError({ error, message: 'Request-local await failed' });
          }
        },
      });

      assert.match(result.requestId, requestIdPattern);
      assert.equal(result.beforeAwait, result.requestId);
      assert.equal(result.afterAwait, result.requestId);
      assert.equal(getRequestId(), null);
    } catch (error) {
      throw createTestError({ error, message: 'Request context await test failed' });
    }
  });

  await test('concurrent request contexts do not bleed', async () => {
    try {
      const results = await Promise.all([
        runWithRequestContext({
          callback: async ({ requestId }) => {
            try {
              await wait({ durationMs: 15 });
              return { currentRequestId: getRequestId(), requestId };
            } catch (error) {
              throw createTestError({ error, message: 'Slow request context failed' });
            }
          },
        }),
        runWithRequestContext({
          callback: async ({ requestId }) => {
            try {
              await wait({ durationMs: 2 });
              return { currentRequestId: getRequestId(), requestId };
            } catch (error) {
              throw createTestError({ error, message: 'Fast request context failed' });
            }
          },
        }),
      ]);

      const [first, second] = results;
      assert.ok(first);
      assert.ok(second);
      assert.notEqual(first.requestId, second.requestId);
      assert.equal(first.currentRequestId, first.requestId);
      assert.equal(second.currentRequestId, second.requestId);
    } catch (error) {
      throw createTestError({ error, message: 'Concurrent request context test failed' });
    }
  });

  await test('logger omits request ID outside request context', () => {
    const loggerUrl = new URL('./logger.ts', import.meta.url).href;
    const source = `import { logger } from ${JSON.stringify(loggerUrl)}; logger.info({ message: 'outside request' });`;
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', source],
      { encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /outside request/);
    assert.doesNotMatch(result.stdout, /requestId=/);
  });

  await test('logger automatically includes the active request ID', () => {
    const loggerUrl = new URL('./logger.ts', import.meta.url).href;
    const requestContextUrl = new URL('./request-context.ts', import.meta.url).href;
    const source = `import { logger } from ${JSON.stringify(loggerUrl)}; import { runWithRequestContext } from ${JSON.stringify(requestContextUrl)}; runWithRequestContext({ callback: () => logger.info({ message: 'inside request' }) });`;
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', source],
      { encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /inside request/);
    assert.match(
      result.stdout,
      /requestId=[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[^\n]*inside request/,
    );
  });
} catch (error) {
  throw createTestError({ error, message: 'Request context test registration failed' });
}
