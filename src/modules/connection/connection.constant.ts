import type { UserFields } from '../user/user.model.ts';

enum CONNECTION_STATUS_ENUM {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  INTERESTED = 'INTERESTED',
  IGNORED = 'IGNORED',
  BLOCKED = 'BLOCKED',
}

const CreateConnectionAllowedStatus = [
  CONNECTION_STATUS_ENUM.INTERESTED,
  CONNECTION_STATUS_ENUM.IGNORED,
];

const UpdateConnectionAllowedStatus = [
  CONNECTION_STATUS_ENUM.ACCEPTED,
  CONNECTION_STATUS_ENUM.REJECTED,
  CONNECTION_STATUS_ENUM.BLOCKED,
];

enum CONNECTION_LIST {
  Received = 'received',
  Sent = 'sent',
  Matches = 'matches',
  Ignored = 'ignored',
  Rejected = 'rejected',
}

const connectionUserSelect: (keyof UserFields)[] = ['age', 'name', 'gender', 'photoUrl', 'id'];

export const ConnectionConstantsCollection = {
  CONNECTION_STATUS_ENUM,
  CONNECTION_LIST,
  CreateConnectionAllowedStatus,
  UpdateConnectionAllowedStatus,
  connectionUserSelect,
};
