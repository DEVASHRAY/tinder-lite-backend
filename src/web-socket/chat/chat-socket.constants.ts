enum ServerToClientEvent {
  MESSAGE_CREATED = 'message.created',
}

// The HTTP send path uses this closed name only after a new Message transaction commits.
export const ChatSocketConstantsCollection = {
  ServerToClientEvent,
};
