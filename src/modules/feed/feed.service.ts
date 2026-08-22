import { Connection } from '../connection/connection.model.ts';
import { ConnectionConstantsCollection } from '../connection/connection.constant.ts';
import { User, type UserDocument } from '../user/user.model.ts';

const getFeed = async ({
  limit,
  page,
  user,
}: {
  user: UserDocument;
  page: number;
  limit: number;
}) => {
  const skip = (page - 1) * limit;

  const connections = await Connection.find({
    $or: [{ senderId: user._id }, { receiverId: user._id }],
  });

  const exlcudedIds = new Set<string>([user.id]);

  connections.forEach((connection) => {
    exlcudedIds.add(connection.senderId.toString());
    exlcudedIds.add(connection.receiverId.toString());
  });

  const feedUsers = await User.find({
    _id: { $nin: Array.from(exlcudedIds) },
  })
    .select(ConnectionConstantsCollection.connectionUserSelect)
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit);

  return feedUsers;
};

export const feedService = {
  getFeed,
};
