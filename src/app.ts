import express from 'express';
// Node needs a real file extension in imports (browsers/bundlers often hide this).
// We write `.ts` in source; the compiler turns it into `.js` in the built files.
import { apiRouter } from './api.routes.ts';
import { connectDB } from './config/database.ts';
import { loadLocalEnv } from './config/env.ts';
import { errorMiddleware } from './middlewares/error-middleware.ts';
import { logger } from './lib/logger.ts';
import cookieParser from 'cookie-parser';

// When you run `npm run dev`, Node starts this file from the top:
// -> loadLocalEnv: if `.env` exists, copy its keys into process.env (before Express is created)
// -> create the app, parse JSON, register user routes, then error middleware
// -> connectDB, then listen on PORT
// -> if connect/listen throw, the try/catch below logs ❌ FAIL and process.exit(1)

try {
  loadLocalEnv();
} catch (error) {
  logger.fail({
    message: 'Failed to load .env',
    error,
  });
  process.exit(1);
}

const app = express();

// `express.json()` reads the HTTP request body as text and turns JSON into `req.body`.
app.use(express.json());
// `cookie-parser` reads the `Cookie` header and sets `req.cookies` (needed to read the JWT cookie).
app.use(cookieParser());

// Every API endpoint shares one versioned prefix, so future breaking changes can move to `/api/v2`.
app.use('/api/v1', apiRouter);

// Error middleware is last: it only runs after a route calls `next(error)`.
app.use(errorMiddleware);

// In Node ESM you can `await` at the top of a file (not only inside an async function).
try {
  await connectDB();
  const port = Number(process.env['PORT']);
  app.listen(port, () => {
    logger.success({
      message: 'Server is running',
      detail: `http://localhost:${String(port)}`,
    });
  });
} catch (error) {
  logger.fail({
    message: 'Failed to start server',
    error,
  });
  // `process` is Node's handle for this running program (there is no browser `window` here).
  // `exit(1)` stops the server. `1` means failure; `0` would mean success.
  process.exit(1);
}
