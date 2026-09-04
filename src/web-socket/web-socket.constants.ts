enum AuthenticationRejectionReason {
  Origin = 'origin',
  Cookie = 'cookie',
  Token = 'token',
  User = 'user',
  Internal = 'internal',
}

const unauthorizedMessage = 'Unauthorized';
const heartbeatPingIntervalMs = 25_000;
const heartbeatPingTimeoutMs = 20_000;
const maximumPacketSizeBytes = 16_384;

export const WebSocketConstantsCollection = {
  AuthenticationRejectionReason,
  heartbeatPingIntervalMs,
  heartbeatPingTimeoutMs,
  maximumPacketSizeBytes,
  unauthorizedMessage,
};
