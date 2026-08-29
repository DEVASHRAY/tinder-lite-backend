import { logger } from '../../lib/logger.ts';
import { Connection } from '../connection/connection.model.ts';
import { ConnectionConstantsCollection } from '../connection/connection.constant.ts';
import { UserConstantsCollection } from '../user/user.constants.ts';
import { User, type UserDocument } from '../user/user.model.ts';

type UserGender =
  (typeof UserConstantsCollection.UserGender)[keyof typeof UserConstantsCollection.UserGender];

type UserInterest =
  (typeof UserConstantsCollection.UserInterest)[keyof typeof UserConstantsCollection.UserInterest];

interface GenderMatchesFromInterestsInput {
  interests: UserInterest[];
}

const genderMatchesFromInterests = ({
  interests,
}: GenderMatchesFromInterestsInput): UserGender[] => {
  const genders: UserGender[] = [];

  for (const interest of interests) {
    if (interest === UserConstantsCollection.UserInterest.Female) {
      genders.push(UserConstantsCollection.UserGender.Female);
    }

    if (interest === UserConstantsCollection.UserInterest.Male) {
      genders.push(UserConstantsCollection.UserGender.Male);
    }
  }

  return genders;
};

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

  try {
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
      gender: { $in: genderMatchesFromInterests({ interests: user.interestedIn }) },
    })
      .select(ConnectionConstantsCollection.connectionUserSelect)
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit);

    return feedUsers;
  } catch (error) {
    if (error instanceof Error) {
      logger.fail({
        message: 'Feed query failed',
        error,
      });
      throw error;
    }

    logger.fail({
      message: 'Feed query failed',
    });
    throw new Error('Feed query failed', { cause: error });
  }
};

export const feedService = {
  getFeed,
};
