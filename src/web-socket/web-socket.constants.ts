enum AuthenticationRejectionReason {
  Origin = 'origin',
  Cookie = 'cookie',
  Token = 'token',
  User = 'user',
  Internal = 'internal',
}

const unauthorizedMessage = 'Unauthorized';

export const WebSocketConstantsCollection = {
  AuthenticationRejectionReason,
  unauthorizedMessage,
};
