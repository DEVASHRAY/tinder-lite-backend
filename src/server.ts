import { createServer } from 'node:http';
import { app } from './app.ts';
import { connectDB } from './config/database.ts';
import { loadLocalEnv } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { chatService } from './modules/chat/chat.service.ts';
import { registerChatWebSocketHandlers } from './web-socket/chat/chat-socket.ts';
import { attachWebSocketServer } from './web-socket/web-socket.ts';

interface StartListeningInput {
  httpServer: ReturnType<typeof createServer>;
  port: number;
}

const startListening = ({ httpServer, port }: StartListeningInput): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      httpServer.off('error', onError);
      httpServer.off('listening', onListening);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onListening = (): void => {
      cleanup();
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);

    try {
      httpServer.listen(port);
    } catch (error) {
      cleanup();
      if (error instanceof Error) {
        reject(error);
        return;
      }

      reject(new Error('HTTP server failed to listen'));
    }
  });
};

try {
  loadLocalEnv();
} catch (error) {
  logger.fail({
    message: 'Failed to load .env',
    error,
  });
  process.exit(1);
}

// In Node ESM, top-level await keeps database and network startup in a predictable order.
try {
  await connectDB();

  const port = Number(process.env['PORT']);
  // Like React/frontend app construction, Express only defines behavior and cannot own a network port.
  // This Node HTTP server lets Express requests and Socket.IO upgrades share one listener.
  const httpServer = createServer(app);
  attachWebSocketServer({ httpServer });
  registerChatWebSocketHandlers({
    markMessagesDelivered: chatService.markMessagesDelivered,
    markMessagesRead: chatService.markMessagesRead,
  });

  // Start listening for HTTP requests on the specified port.
  await startListening({ httpServer, port });
  logger.success({
    message: 'Server is running',
    detail: `http://localhost:${String(port)}`,
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
