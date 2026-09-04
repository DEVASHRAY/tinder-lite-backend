import { Router } from 'express';
import { chatController } from './chat.controller.ts';

export const chatRouter = Router();

chatRouter.get('/conversations', chatController.getConversations);

chatRouter.get('/connections/:connectionId/messages', chatController.getMessages);

chatRouter.post('/connections/:connectionId/messages', chatController.sendMessage);
