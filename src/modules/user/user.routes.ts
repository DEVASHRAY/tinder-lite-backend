import { Router } from 'express';
// Node needs a real file extension in imports (browsers/bundlers often hide this).
// We write `.ts` in source; the compiler turns it into `.js` in the built files.
import { userController } from './user.controller.ts';

// Role of `user.routes.ts`: "which API calls which function?"
// Flow: Route → Controller → Service → Model → Mongo. Response: Mongo → Model → Service → Controller → HTTP.
// This file: HTTP method + URL → controller. No `req`/`res`, no Mongo, no business rules.
export const userRouter = Router();

userRouter.get('/', userController.getAllUsers);

userRouter.get('/:id', userController.getUser);

userRouter.delete('/:id', userController.deleteUser);

userRouter.patch('/:id', userController.updateUser);
