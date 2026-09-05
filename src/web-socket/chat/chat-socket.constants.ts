enum ClientToServerEvent {
  MARK_MESSAGE_DELIVERED = 'message.mark-delivered',
  MARK_MESSAGE_READ = 'message.mark-read',
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
