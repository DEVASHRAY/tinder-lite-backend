import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';

// Same two people always get the same pair, whether A→B or B→A.
// Hex user ids are the same length, so string sort matches Mongo ObjectId order.
export const getMinMaxUserIds = ({
  senderId,
  receiverId,
}: {
  senderId: string;
  receiverId: string;
}) => {
  const sortedUserIds = [senderId, receiverId].sort();
  const minUserId = sortedUserIds[0];
  const maxUserId = sortedUserIds[1];

  if (!minUserId || !maxUserId) {
    throw new ApplicationError({
      message: 'Sender and receiver ids are required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  return { minUserId, maxUserId };
};
