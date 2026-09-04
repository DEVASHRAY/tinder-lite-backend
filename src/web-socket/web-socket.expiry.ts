import type { RegisterWebSocketExpiryInput } from './web-socket.types.ts';

export const registerWebSocketExpiry = ({ io }: RegisterWebSocketExpiryInput): void => {
  io.on('connection', (socket) => {
    const remainingLifetimeMs = socket.data.accessTokenExpiresAtMs - Date.now();

    // A connected socket outlives its handshake request, so it needs its own expiry timer.
    const expirationTimer = setTimeout(() => {
      socket.disconnect(true);
    }, remainingLifetimeMs);

    // `clearTimeout` is safe after a timer fires and prevents early disconnects, including a
    // private-room join failure, from retaining the timer handle.
    socket.once('disconnect', () => {
      clearTimeout(expirationTimer);
    });
  });
};
