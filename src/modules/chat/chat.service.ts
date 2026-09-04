import mongoose from 'mongoose';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { logger } from '../../lib/logger.ts';
import { ConnectionConstantsCollection } from '../connection/connection.constant.ts';
import { Connection } from '../connection/connection.model.ts';
import { connectionService } from '../connection/connection.service.ts';
import { User } from '../user/user.model.ts';
import { ChatConstantsCollection } from './chat.constants.ts';
import type {
  ConversationInboxItem,
  MessageDeliveryStatus,
  MessageHistoryResponse,
} from './chat.types.ts';
import { Conversation } from './conversation.model.ts';
import { Message } from './message.model.ts';

const getConversationInbox = async ({ userId, cursor }: { userId: string; cursor?: string }) => {
  try {
    // Step 1: Every inbox page contains at most 20 conversations.
    const pageLimit = ChatConstantsCollection.conversationInboxDefaultLimit;
    // MongoDB stores user references as ObjectIds, so convert the authenticated string ID once.
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let cursorPosition:
      | {
          createdAt: Date;
          conversationId: mongoose.Types.ObjectId;
        }
      | undefined;

    if (cursor) {
      // Step 2: Split the server-created cursor into:
      // group 1 = last-message time in milliseconds, group 2 = Conversation ObjectId.
      // Example: `1788543200000:68baf01234567890abcdef12`.
      const cursorMatch = /^([1-9]\d{12}):([0-9a-f]{24})$/u.exec(cursor);
      const createdAtMilliseconds = cursorMatch?.at(1);
      const conversationId = cursorMatch?.at(2);

      // Both parts must exist; otherwise the client changed or corrupted the cursor.
      if (!createdAtMilliseconds || !conversationId) {
        throw new ApplicationError({
          message: 'Cursor is invalid',
          statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
        });
      }

      // Convert the two cursor strings into the same Date/ObjectId types stored by MongoDB.
      cursorPosition = {
        createdAt: new Date(Number(createdAtMilliseconds)),
        conversationId: new mongoose.Types.ObjectId(conversationId),
      };
    }

    // Step 3: Always select Conversations containing the authenticated user.
    // The object spread adds the cursor conditions only when an older page was requested.
    const conversationMatch = {
      'participants.userId': userObjectId,
      ...(cursorPosition
        ? {
            // `$or` accepts either way a Conversation can come after the previous page:
            // an older message time, or the same time with a smaller Conversation ID.
            $or: [
              // `$lt` means "less than", which means older in descending time order.
              { 'lastMessage.createdAt': { $lt: cursorPosition.createdAt } },
              {
                // `_id` is the tie-breaker when two Conversations have the same message time.
                'lastMessage.createdAt': cursorPosition.createdAt,
                _id: { $lt: cursorPosition.conversationId },
              },
            ],
          }
        : {}),
    };

    // Step 4: `aggregate` runs the following stages inside MongoDB in their listed order.
    // Each stage receives the documents produced by the previous stage.
    const conversations = await Conversation.aggregate<ConversationInboxItem>([
      {
        // `$match` removes Conversations that do not satisfy `conversationMatch`.
        $match: conversationMatch,
      },
      {
        // `$sort` uses `-1` for descending order, so the latest active chat appears first.
        // `_id: -1` gives Conversations with equal message times one stable order.
        $sort: {
          'lastMessage.createdAt': -1,
          _id: -1,
        },
      },
      {
        // `$lookup` joins another collection, similar to a SQL JOIN.
        // Example: Conversation `{ connectionId: A }` joins Connection `{ _id: A }`.
        $lookup: {
          // `from` is the collection we want to join. Here its MongoDB name is `connections`.
          from: Connection.collection.name,
          // `localField` belongs to the current Conversation document.
          // Example value: `conversation.connectionId`.
          localField: 'connectionId',
          // `foreignField` belongs to the joined Connection document.
          // MongoDB joins when `conversation.connectionId === connection._id`.
          foreignField: '_id',
          // `pipeline` runs these additional steps on the Connection found by the ID join.
          pipeline: [
            {
              // `$match` keeps the Connection only when it is currently accepted
              // and the authenticated user is either its sender or receiver.
              $match: {
                status: ConnectionConstantsCollection.CONNECTION_STATUS_ENUM.ACCEPTED,
                $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
              },
            },
            {
              // `$project` controls which Connection fields continue through the pipeline.
              // `1` includes senderId/receiverId; `_id: 0` excludes the Connection ID.
              $project: {
                _id: 0,
                senderId: 1,
                receiverId: 1,
              },
            },
            {
              // `$limit` keeps at most one result. The `_id` join is already unique,
              // so this is only a defensive cap.
              $limit: 1,
            },
          ],
          // `as` stores joined matches in this new array on the Conversation.
          // Example: `authorizedConnections: [{ senderId: A, receiverId: B }]`.
          // A rejected or missing Connection produces `authorizedConnections: []`.
          as: 'authorizedConnections',
        },
      },
      {
        // `$lookup` returned an array. `$unwind` turns its one item into a normal object.
        // An empty array is removed by default, which hides stale or non-accepted Connections.
        // Example: `authorizedConnections: [{...}]` becomes `authorizedConnections: {...}`.
        $unwind: '$authorizedConnections',
      },
      {
        // One extra authorized row is a lookahead that tells us whether another page exists.
        $limit: pageLimit + 1,
      },
      {
        // `$set` adds the peer's participant state only as temporary aggregation data.
        // The final `$project` omits it so raw delivery/read watermarks never reach the API.
        $set: {
          peerParticipant: {
            // `$arrayElemAt` unwraps the first filtered item.
            // Example: `[{ userId: peerId }]` at index `0` becomes `{ userId: peerId }`.
            $arrayElemAt: [
              {
                // `$filter` scans the bounded two-person array and retains only the peer.
                // Example: `[viewer, peer]` becomes `[peer]`.
                $filter: {
                  input: '$participants',
                  as: 'participant',
                  // `$ne` means "not equal"; the participant whose ID is not the viewer is the peer.
                  cond: { $ne: ['$$participant.userId', userObjectId] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        // A Conversation has two participant objects. `$unwind` creates one temporary
        // pipeline row per participant so the next `$match` can select the current user.
        // Example: `participants: [A, B]` temporarily becomes one A row and one B row.
        $unwind: '$participants',
      },
      {
        // Keep only the authenticated user's unread state from the two participants.
        $match: {
          'participants.userId': userObjectId,
        },
      },
      {
        // `$set` creates a temporary `peerUserId` field used by the next User lookup.
        $set: {
          peerUserId: {
            // `$cond` is MongoDB's if/then/else expression.
            // `$eq` checks whether the authenticated user is the Connection sender.
            // If true, the receiver is the peer; otherwise, the sender is the peer.
            $cond: [
              { $eq: ['$authorizedConnections.senderId', userObjectId] },
              '$authorizedConnections.receiverId',
              '$authorizedConnections.senderId',
            ],
          },
        },
      },
      {
        // Join the peer's User document so the inbox can show their name and photo.
        $lookup: {
          // Read matching documents from MongoDB's `users` collection.
          from: User.collection.name,
          // Use the temporary peer ID calculated by `$set` above.
          localField: 'peerUserId',
          // Match that value against `User._id`.
          foreignField: '_id',
          // Run these shaping steps on the matched User document.
          pipeline: [
            {
              // Keep only public inbox fields; `_id` is already available as `peerUserId`.
              $project: {
                _id: 0,
                name: 1,
                photoUrl: 1,
              },
            },
            {
              // User `_id` is unique, so this is only a defensive one-row cap.
              $limit: 1,
            },
          ],
          // `$lookup` stores its matches in a `peer` array.
          // Example: `peer: [{ name: "Riya", photoUrl: "https://..." }]`.
          as: 'peer',
        },
      },
      {
        // Convert the one-item `peer` array into an object.
        $unwind: {
          // `path` names the array field that should be unwound.
          path: '$peer',
          // Keep the Conversation even if its User profile is unexpectedly missing.
          // The final `$ifNull` expressions will then return null for name and photo.
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Step 5: `$project` creates the final safe API item instead of returning DB documents.
        $project: {
          // Exclude MongoDB's original `_id`; expose it below as `conversationId`.
          _id: 0,
          // `$toString` converts ObjectIds into plain JSON-friendly ID strings.
          conversationId: { $toString: '$_id' },
          connectionId: { $toString: '$connectionId' },
          // Build the nested public summary for the other chat participant.
          peer: {
            id: { $toString: '$peerUserId' },
            // `$ifNull` returns its second value when the first field is null or missing.
            name: { $ifNull: ['$peer.name', null] },
            photoUrl: { $ifNull: ['$peer.photoUrl', null] },
          },
          // A leading `$` reads a field from the current pipeline document.
          lastMessage: {
            textPreview: '$lastMessage.textPreview',
            createdAt: '$lastMessage.createdAt',
            sentByAuthenticatedUser: {
              // `$eq` returns a boolean by comparing the summary's sender with the viewer.
              // Example: sender A viewed by A becomes `true`; viewed by B becomes `false`.
              $eq: ['$lastMessage.senderId', userObjectId],
            },
            deliveryStatus: {
              // `$cond` is an if/then/else: incoming latest messages return `null`;
              // outgoing latest messages continue to the peer-watermark calculation.
              $cond: [
                {
                  // `$ne` detects an incoming message because its sender differs from the viewer.
                  $ne: ['$lastMessage.senderId', userObjectId],
                },
                null,
                {
                  // `$switch` checks the strongest status first, then falls back to `SENT`.
                  // Example: a read watermark of 8 for latest sequence 8 selects `READ`.
                  $switch: {
                    branches: [
                      {
                        case: {
                          // `$gte` means "greater than or equal"; reading through the latest
                          // sequence proves the peer has read that outgoing message.
                          $gte: ['$peerParticipant.lastReadSequenceNumber', '$lastSequenceNumber'],
                        },
                        then: ChatConstantsCollection.MessageDeliveryStatus.READ,
                      },
                      {
                        case: {
                          // This `$gte` checks delivery only after the read check failed.
                          // Example: delivered 8 versus latest 8 selects `DELIVERED`.
                          $gte: [
                            '$peerParticipant.lastDeliveredSequenceNumber',
                            '$lastSequenceNumber',
                          ],
                        },
                        then: ChatConstantsCollection.MessageDeliveryStatus.DELIVERED,
                      },
                    ],
                    default: ChatConstantsCollection.MessageDeliveryStatus.SENT,
                  },
                },
              ],
            },
          },
          // Return only the authenticated participant's unread count; default missing data to zero.
          unreadCount: { $ifNull: ['$participants.unreadCount', 0] },
        },
      },
    ]);

    // Step 6: A 21st result means another 20-item page exists.
    const hasMore = conversations.length > pageLimit;
    // Remove the lookahead row before sending the response.
    const items = hasMore ? conversations.slice(0, pageLimit) : conversations;
    // `.at(-1)` reads the final Conversation returned on this page.
    const lastItem = items.at(-1);
    // The next cursor records that Conversation's sort position.
    // No extra row means no older page, so return null.
    const nextCursor =
      hasMore && lastItem
        ? `${String(lastItem.lastMessage.createdAt.getTime())}:${lastItem.conversationId}`
        : null;

    return {
      items,
      nextCursor,
    };
  } catch (error) {
    // Expected validation/authorization failures keep their intentional HTTP status.
    if (error instanceof ApplicationError) {
      logger.warn({ message: 'Conversation inbox request was rejected' });
      throw error;
    }

    // Real Error objects retain their stack and message for internal diagnostics.
    if (error instanceof Error) {
      logger.fail({ message: 'Failed to load conversation inbox', error });
      throw error;
    }

    // JavaScript can throw non-Error values; wrap one so callers always receive an Error.
    logger.fail({ message: 'Failed to load conversation inbox' });
    throw new Error('Failed to load conversation inbox', { cause: error });
  }
};

const getMessageHistory = async ({
  userId,
  connectionId,
  lastLoadedSequenceNumber,
}: {
  userId: string;
  connectionId: string;
  lastLoadedSequenceNumber?: number;
}): Promise<MessageHistoryResponse> => {
  try {
    // Step 1: Stop unless the authenticated user belongs to this accepted Connection.
    const connection = await connectionService.requireAcceptedConnection({
      connectionId,
      requesterUserId: userId,
    });

    // Step 2: Find the Conversation linked to the Connection that was just authorized.
    const conversation = await Conversation.findOne({
      connectionId: connection._id,
    });

    if (!conversation) {
      // Conversations start with the first sent message, so no document means empty history.
      return {
        items: [],
        nextLastLoadedSequenceNumber: null,
      };
    }

    // Step 3: Select the authenticated user's peer from the accepted Connection.
    // Conversation receipt state belongs to each participant, so the peer's watermarks
    // describe how far the peer received and read this viewer's outgoing messages.
    const peerUserId = connection.senderId.equals(userId)
      ? connection.receiverId
      : connection.senderId;
    const peerParticipant = conversation.participants.find((participant) =>
      participant.userId.equals(peerUserId),
    );

    if (!peerParticipant) {
      // A Conversation copied both accepted-Connection users when it was created.
      // Missing the current peer means stored relationship state is inconsistent.
      throw new ApplicationError({
        message: 'Conversation peer participant state is inconsistent',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
      });
    }

    const pageLimit = ChatConstantsCollection.messageHistoryDefaultLimit;

    // Step 4: Build the Message filter. The cursor is the oldest sequence currently loaded.
    // `$lt` means "less than", so a cursor of 81 selects sequence numbers 80 and below.
    const messageFilter = lastLoadedSequenceNumber
      ? {
          conversationId: conversation._id,
          sequenceNumber: { $lt: lastLoadedSequenceNumber },
        }
      : { conversationId: conversation._id };

    // Step 5: `find` reads Messages matching the Conversation and optional sequence cursor.
    // `sort({ sequenceNumber: -1 })` puts the newest matching Message first.
    // `limit(pageLimit + 1)` fetches one lookahead row without a separate count query.
    const messages = await Message.find(messageFilter)
      .sort({ sequenceNumber: -1 })
      .limit(pageLimit + 1);

    let nextLastLoadedSequenceNumber: number | null = null;

    // Step 6: More than 20 rows means an older page exists.
    if (messages.length > pageLimit) {
      // `pop()` removes the lookahead row, keeping this response within the page limit.
      messages.pop();

      // Results are still newest-first, so the last item is the oldest message being returned.
      const oldestReturnedMessage = messages.at(-1);

      if (oldestReturnedMessage) {
        // Its sequence is the next cursor; the next `$lt` query continues below this message.
        nextLastLoadedSequenceNumber = oldestReturnedMessage.sequenceNumber;
      }
    }

    // Step 7: The DB returned newest-first; reverse this page for natural oldest-first chat display.
    messages.reverse();

    // HTTP returns a directly renderable status for each item in this bounded page.
    // Future realtime receipt events will carry one through-sequence watermark so the
    // frontend can update many already-loaded outgoing messages in one batched event.
    const items = messages.map((message) => {
      let deliveryStatus: MessageDeliveryStatus | null = null;

      // Receipt ticks belong only to messages sent by the authenticated viewer.
      if (message.senderId.equals(userId)) {
        if (message.sequenceNumber <= peerParticipant.lastReadSequenceNumber) {
          // Read is the strongest status, so check its peer watermark first.
          deliveryStatus = ChatConstantsCollection.MessageDeliveryStatus.READ;
        } else if (message.sequenceNumber <= peerParticipant.lastDeliveredSequenceNumber) {
          deliveryStatus = ChatConstantsCollection.MessageDeliveryStatus.DELIVERED;
        } else {
          deliveryStatus = ChatConstantsCollection.MessageDeliveryStatus.SENT;
        }
      }

      // Build a new plain response object instead of attaching ad-hoc state to a Message document.
      return {
        id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        text: message.text,
        clientMessageId: message.clientMessageId,
        sequenceNumber: message.sequenceNumber,
        createdAt: message.createdAt,
        deliveryStatus,
      };
    });

    // Return this page plus the cursor needed to request the next older page.
    return {
      items,
      nextLastLoadedSequenceNumber,
    };
  } catch (error) {
    // Preserve expected application failures such as forbidden or invalid requests.
    if (error instanceof ApplicationError) {
      logger.warn({ message: 'Chat message history request was rejected' });
      throw error;
    }

    // Log unexpected Error objects without logging private message text.
    if (error instanceof Error) {
      logger.fail({ message: 'Failed to load chat messages', error });
      throw error;
    }

    // Normalize an unusual non-Error throw into a real Error.
    logger.fail({ message: 'Failed to load chat messages' });
    throw new Error('Failed to load chat messages', { cause: error });
  }
};

const sendMessage = async ({
  userId,
  connectionId,
  text,
  clientMessageId,
}: {
  userId: string;
  connectionId: string;
  text: string;
  clientMessageId: string;
}) => {
  // Step 1: Receive the authenticated user, connection ID, text, and client message ID.
  try {
    // Step 2: Require an accepted Connection containing the authenticated user.
    const connection = await connectionService.requireAcceptedConnection({
      connectionId,
      requesterUserId: userId,
    });

    // Step 3: Identify the other Connection participant as the message recipient.
    // `.equals` compares ObjectId values; JavaScript `===` would compare object references.
    const recipientUserId = connection.senderId.equals(userId)
      ? connection.receiverId
      : connection.senderId;
    // Store a canonical form so whitespace/casing cannot bypass validation or idempotency.
    const normalizedText = text.trim();
    const normalizedClientMessageId = clientMessageId.trim().toLowerCase();

    // A concurrent first send can race on the unique Connection-to-Conversation index.
    // Retry once so the losing request can load the Conversation created by the winner.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        // Step 4: Start a transaction so every chat write succeeds or rolls back together.
        // Returning from this callback commits; throwing from it aborts all writes.
        return await mongoose.connection.transaction(async (session) => {
          // Step 5: Find the Conversation for this Connection, if one already exists.
          // `.session(session)` includes this read in the transaction's consistent snapshot.
          const conversation = await Conversation.findOne({
            connectionId: connection._id,
          }).session(session);

          // Step 6: Return the original Message when this client message ID is a retry.
          if (conversation) {
            // All three fields identify one logical send by this sender in this Conversation.
            const existingMessage = await Message.findOne({
              conversationId: conversation._id,
              senderId: userId,
              clientMessageId: normalizedClientMessageId,
            }).session(session);

            if (existingMessage) {
              if (existingMessage.text !== normalizedText) {
                throw new ApplicationError({
                  message: 'Client message ID was already used for different text',
                  statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.CONFLICT,
                });
              }

              return {
                created: false,
                message: existingMessage,
              };
            }
          }

          // Generate these before either document is saved because Conversation.lastMessage
          // must reference the same Message ID and creation time as the Message document.
          const messageId = new mongoose.Types.ObjectId();
          const createdAt = new Date();
          const lastMessage = {
            messageId,
            senderId: userId,
            textPreview: normalizedText.slice(
              0,
              ChatConstantsCollection.lastMessagePreviewMaxLength,
            ),
            createdAt,
          };
          let conversationIdForMessage: mongoose.Types.ObjectId;
          let sequenceNumber: number;

          if (!conversation) {
            // Step 7: Create the Conversation and participant state on the first message.
            // The recipient starts with one unread Message; the sender starts with zero.
            const newConversation = new Conversation({
              connectionId: connection._id,
              participants: [
                {
                  userId: connection.senderId,
                  unreadCount: connection.senderId.equals(recipientUserId) ? 1 : 0,
                },
                {
                  userId: connection.receiverId,
                  unreadCount: connection.receiverId.equals(recipientUserId) ? 1 : 0,
                },
              ],
              // The first Message in a Conversation always receives sequence number 1.
              lastSequenceNumber: 1,
              lastMessage,
            });

            // Saving with the transaction session makes this insert roll back if Message save fails.
            await newConversation.save({ session });
            conversationIdForMessage = newConversation._id;
            sequenceNumber = newConversation.lastSequenceNumber;
          } else {
            // Steps 8 and 10: Allocate the sequence, replace the summary, and add one unread.
            const updatedConversation = await Conversation.findOneAndUpdate(
              // Filter: update this Conversation only when it contains the recipient.
              {
                // Select the exact Conversation being used for this message.
                _id: conversation._id,
                // Stop the update if the expected recipient is missing from its participants.
                'participants.userId': recipientUserId,
                // `$lt` means "less than" and prevents the next increment becoming an unsafe number.
                lastSequenceNumber: { $lt: Number.MAX_SAFE_INTEGER },
              },
              // Update: allocate one sequence, add one unread, and replace the latest summary.
              {
                // `$inc` changes counters atomically, preventing simultaneous sends from losing updates.
                $inc: {
                  // Reserve the next ordered position for the new Message.
                  lastSequenceNumber: 1,
                  // `$[recipient]` targets only the participant selected by `arrayFilters` below.
                  'participants.$[recipient].unreadCount': 1,
                },
                // `$set` replaces the previous inbox summary with this new Message summary.
                $set: { lastMessage },
              },
              // Options: target the recipient, validate, return the new value, and join the transaction.
              {
                // Define which participant the `$[recipient]` placeholder represents.
                arrayFilters: [{ 'recipient.userId': recipientUserId }],
                // Return the Conversation after updating it so we can read its new sequence number.
                new: true,
                // Run Mongoose validation for supported updated fields such as `lastMessage`.
                runValidators: true,
                // Include this update in the same transaction as the Message insert.
                session,
              },
            );

            if (!updatedConversation) {
              throw new ApplicationError({
                message: 'Conversation could not allocate a sequence number',
                statusCode:
                  ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
              });
            }

            conversationIdForMessage = updatedConversation._id;
            sequenceNumber = updatedConversation.lastSequenceNumber;
          }

          // Step 9: Save the immutable Message using only server-owned identity and ordering.
          // The client controls text/clientMessageId, while the server controls IDs and sequence.
          const message = new Message({
            _id: messageId,
            conversationId: conversationIdForMessage,
            senderId: userId,
            text: normalizedText,
            clientMessageId: normalizedClientMessageId,
            sequenceNumber,
            createdAt,
          });

          await message.save({ session });

          // Step 11: Returning successfully commits the transaction.
          return {
            created: true,
            message,
          };
        });
      } catch (error) {
        // MongoDB error 11000 means a unique index rejected a duplicate insert.
        // On a concurrent first Message, retry once and load the winner's Conversation.
        if (
          error instanceof mongoose.mongo.MongoServerError &&
          error.code === 11000 &&
          attempt === 0
        ) {
          logger.warn({ message: 'Retrying chat message after a concurrent insert' });
          continue;
        }

        throw error;
      }
    }

    // The loop normally returns or throws; this protects against an unexpected fall-through.
    throw new ApplicationError({
      message: 'Message could not be saved',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  } catch (error) {
    // Keep intentional API failures such as conflict or forbidden responses unchanged.
    if (error instanceof ApplicationError) {
      logger.warn({ message: 'Chat message request was rejected' });
      throw error;
    }

    // Log unexpected Error objects without including the private message text.
    if (error instanceof Error) {
      logger.fail({ message: 'Failed to save chat message', error });
      throw error;
    }

    // Wrap unusual non-Error throws so Express receives a consistent Error value.
    logger.fail({ message: 'Failed to save chat message' });
    throw new Error('Failed to save chat message', { cause: error });
  }
};

export const chatService = {
  getConversationInbox,
  getMessageHistory,
  sendMessage,
};
