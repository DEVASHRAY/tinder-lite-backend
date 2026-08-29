export interface SesTypeCollection {
  SendEmailInput: {
    to: string;
    subject: string;
    text: string;
    html?: string | undefined;
  };
  SendEmailResult: {
    messageId: string;
  };
}
