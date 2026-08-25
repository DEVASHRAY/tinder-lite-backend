import { Router } from 'express';
import { adminMiddleware } from './middlewares/admin-middleware.ts';
import { authMiddleware } from './middlewares/auth-middleware.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { connectionRouter } from './modules/connection/connection.routes.ts';
import { feedRouter } from './modules/feed/feed.routes.ts';
import { profileRouter } from './modules/profile/profile.routes.ts';
import { userRouter } from './modules/user/user.routes.ts';

export const apiRouter = Router();

const apiV1Router = Router();

apiRouter.use('/v1', apiV1Router);

apiV1Router.use('/auth', authRouter);

apiV1Router.use(authMiddleware);

apiV1Router.use('/users', adminMiddleware, userRouter);
apiV1Router.use('/profile', profileRouter);
apiV1Router.use('/connections', connectionRouter);
apiV1Router.use('/feed', feedRouter);

/*
 * API version routing
 *
 * - `app.ts` mounts `apiRouter` at `/api`.
 * - `apiV1Router` preserves the existing `/api/v1/*` contracts.
 * - A future Profile V2 can mount at `/v2/profile` without moving Auth, Feed,
 *   Connections, or Users away from their V1 routes.
 *
 * Registration order
 *
 * - Mounting `/v1` first makes the parent-to-child URL flow easier to read.
 * - Express keeps a reference to `apiV1Router`, so routes added below remain
 *   available after Node finishes loading this module and starts the server.
 */
