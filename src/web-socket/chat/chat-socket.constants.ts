enum ClientToServerEvent {
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
}

enum ServerToClientEvent {
  MESSAGE_CREATED = 'message.created',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
}

export const ChatSocketConstantsCollection = {
  ClientToServerEvent,
  ServerToClientEvent,
};
