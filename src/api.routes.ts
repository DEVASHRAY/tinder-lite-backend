import { Router } from 'express';
import { adminMiddleware } from './middlewares/admin-middleware.ts';
import { authMiddleware } from './middlewares/auth-middleware.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { connectionRouter } from './modules/connection/connection.routes.ts';
import { feedRouter } from './modules/feed/feed.routes.ts';
import { profileRouter } from './modules/profile/profile.routes.ts';
import { userRouter } from './modules/user/user.routes.ts';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

apiRouter.use(authMiddleware);

apiRouter.use('/users', adminMiddleware, userRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/connections', connectionRouter);
apiRouter.use('/feed', feedRouter);
