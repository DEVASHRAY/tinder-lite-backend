import { Router } from 'express';
import { chatController } from './chat.controller.ts';

export const chatRouter = Router();

chatRouter.get('/conversations', chatController.getConversationInbox);

chatRouter.get('/connections/:connectionId/messages', chatController.getMessageHistory);

chatRouter.post('/connections/:connectionId/messages', chatController.sendMessage);
