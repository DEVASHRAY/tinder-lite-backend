import type { Types } from 'mongoose';

const participantsValidator = ({ userIds }: { userIds: Types.ObjectId[] }) => {
  if (userIds.length !== 2) {
    return false;
  }

  const firstParticipantId = userIds[0]?.toString();
  const secondParticipantId = userIds[1]?.toString();

  if (!firstParticipantId || !secondParticipantId || firstParticipantId === secondParticipantId) {
    return false;
  }

  return true;
};

export const ConversationUtilsCollection = {
  participantsValidator,
};
