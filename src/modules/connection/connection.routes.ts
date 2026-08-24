import { Router } from 'express';
import { connectionController } from './connection.controller.ts';

export const connectionRouter = Router();

connectionRouter.post('/', connectionController.createConnection);

connectionRouter.patch('/:connectionId', connectionController.updateConnection);

connectionRouter.get('/', connectionController.getConnections);
