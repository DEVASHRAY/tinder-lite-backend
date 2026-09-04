import cookieParser from 'cookie-parser';
import express from 'express';
// Node needs a real file extension in imports (browsers/bundlers often hide this).
// We write `.ts` in source; the compiler turns it into `.js` in the built files.
import { apiRouter } from './api.routes.ts';
import { errorMiddleware } from './middlewares/error-middleware.ts';
import { HttpConstantsCollection } from './lib/http.constants.ts';
import { requestAccessMiddleware } from './middlewares/request-access-middleware.ts';
import { requestContextMiddleware } from './middlewares/request-context-middleware.ts';

// Importing the app only constructs HTTP handling; server.ts owns database and network startup.
export const app = express();

// Start request-local state before parsers and routes so their failures keep the same response ID.
app.use(requestContextMiddleware);
// Observe completion before parsers and routes so successes, errors, aborts, and 404s are all covered.
app.use(requestAccessMiddleware);
// `express.json()` reads the HTTP request body as text and turns JSON into `req.body`.
// Default limit is 100kb; bulk signup seed (~200kb for 100 users) needs more.
app.use(express.json({ limit: HttpConstantsCollection.jsonBodyLimit }));
// `cookie-parser` reads the `Cookie` header and sets `req.cookies` (needed to read the JWT cookie).
app.use(cookieParser());

/*
 * API namespace
 * - `app.ts` decides that every backend HTTP endpoint starts with `/api`.
 * - `apiRouter` owns version prefixes such as `/v1` and future `/v2` routes.
 */
app.use('/api', apiRouter);

// Error middleware is last: it only runs after a route calls `next(error)`.
app.use(errorMiddleware);
