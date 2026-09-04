// These response-only values are computed from receipt watermarks; Message documents stay immutable.
enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

const messageTextMaxLength = 2000;
const lastMessagePreviewMaxLength = 120;
const clientMessageIdLength = 36;
const messageHistoryDefaultLimit = 20;
const messageHistoryMaxLimit = 20;
const conversationInboxDefaultLimit = 20;

const safeIntegerValidator = {
  validator: Number.isSafeInteger,
  message: '{VALUE} must be a safe integer',
};

const nonNegativeSafeIntegerField = {
  type: Number,
  required: true,
  default: 0,
  min: 0,
  validate: safeIntegerValidator,
};

export const ChatConstantsCollection = {
  MessageDeliveryStatus,
  messageTextMaxLength,
  lastMessagePreviewMaxLength,
  clientMessageIdLength,
  messageHistoryDefaultLimit,
  messageHistoryMaxLimit,
  conversationInboxDefaultLimit,
  safeIntegerValidator,
  nonNegativeSafeIntegerField,
};
