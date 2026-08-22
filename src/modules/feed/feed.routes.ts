import { Router } from 'express';
import { feedController } from './feed.controller.ts';

export const feedRouter = Router();

feedRouter.get('/feed', feedController.getFeed);
