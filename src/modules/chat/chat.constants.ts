const messageTextMaxLength = 2000;
const lastMessagePreviewMaxLength = 120;
const clientMessageIdLength = 36;
const messageHistoryDefaultLimit = 30;
const messageHistoryMaxLimit = 50;
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
  messageTextMaxLength,
  lastMessagePreviewMaxLength,
  clientMessageIdLength,
  messageHistoryDefaultLimit,
  messageHistoryMaxLimit,
  conversationInboxDefaultLimit,
  safeIntegerValidator,
  nonNegativeSafeIntegerField,
};
