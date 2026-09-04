import mongoose from 'mongoose';
import { ApplicationErrorConstantsCollection } from '../../lib/application-error.constants.ts';
import { ApplicationError } from '../../lib/application-error.ts';
import { logger } from '../../lib/logger.ts';
import { connectionService } from '../connection/connection.service.ts';
import { ChatConstantsCollection } from './chat.constants.ts';
import { Conversation } from './conversation.model.ts';
import { Message } from './message.model.ts';

const getConversations = () => ({});

const getMessages = () => ({});

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
    const recipientUserId = connection.senderId.equals(userId)
      ? connection.receiverId
      : connection.senderId;
    const normalizedText = text.trim();
    const normalizedClientMessageId = clientMessageId.trim().toLowerCase();

    // A concurrent first send can race on the unique Connection-to-Conversation index.
    // Retry once so the losing request can load the Conversation created by the winner.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        // Step 4: Start a transaction so every chat write succeeds or rolls back together.
        return await mongoose.connection.transaction(async (session) => {
          // Step 5: Find the Conversation for this Connection, if one already exists.
          const conversation = await Conversation.findOne({
            connectionId: connection._id,
          }).session(session);

          // Step 6: Return the original Message when this client message ID is a retry.
          if (conversation) {
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
              lastSequenceNumber: 1,
              lastMessage,
            });

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

    throw new ApplicationError({
      message: 'Message could not be saved',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  } catch (error) {
    if (error instanceof ApplicationError) {
      logger.warn({ message: 'Chat message request was rejected' });
      throw error;
    }

    if (error instanceof Error) {
      logger.fail({ message: 'Failed to save chat message', error });
      throw error;
    }

    logger.fail({ message: 'Failed to save chat message' });
    throw new Error('Failed to save chat message', { cause: error });
  }
};

export const chatService = {
  getConversations,
  getMessages,
  sendMessage,
};
