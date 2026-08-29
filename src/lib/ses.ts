import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import validator from 'validator';
import { ApplicationErrorConstantsCollection } from './application-error.constants.ts';
import { ApplicationError } from './application-error.ts';
import { logger } from './logger.ts';
import { SesConstantsCollection } from './ses.constants.ts';
import type { SesTypeCollection } from './ses.types.ts';

let sesClient: SESv2Client | undefined;

const getAwsRegion = () => {
  const region = process.env['AWS_REGION'];

  if (!region) {
    throw new ApplicationError({
      message: 'AWS_REGION is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return region;
};

const getFromEmailAddress = () => {
  const fromEmailAddress = process.env['SES_FROM_EMAIL'];

  logger.info({
    message: 'SES email config',
    detail: `From Email Address: ${fromEmailAddress ?? 'unavailable'} , AWS Region: ${getAwsRegion()} ,`,
  });

  if (!fromEmailAddress) {
    throw new ApplicationError({
      message: 'SES_FROM_EMAIL is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return fromEmailAddress;
};

// Amazon Simple Email Service (SES) is the AWS API that sends email.
// Built on first use so `loadLocalEnv()` has already copied `.env` into `process.env`.
// No access keys: the AWS SDK reads the IAM role attached to this EC2 instance.
const getClient = () => {
  if (sesClient) {
    return sesClient;
  }

  sesClient = new SESv2Client({
    region: getAwsRegion(),
  });

  return sesClient;
};

const buildSimpleContent = ({
  subject,
  text,
  html,
}: Pick<SesTypeCollection['SendEmailInput'], 'subject' | 'text' | 'html'>) => {
  const charset = SesConstantsCollection.charset;
  const subjectContent = { Data: subject, Charset: charset };
  const textContent = { Data: text, Charset: charset };

  if (html) {
    return {
      Subject: subjectContent,
      Body: {
        Text: textContent,
        Html: { Data: html, Charset: charset },
      },
    };
  }

  return {
    Subject: subjectContent,
    Body: {
      Text: textContent,
    },
  };
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SesTypeCollection['SendEmailInput']): Promise<SesTypeCollection['SendEmailResult']> => {
  if (!to || !subject || !text) {
    throw new ApplicationError({
      message: 'To, subject, and text are required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  if (!validator.isEmail(to)) {
    throw new ApplicationError({
      message: 'Please enter a valid email address',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.UNPROCESSABLE_ENTITY,
    });
  }

  // SendEmailCommand is the AWS request object. `client.send` is the network call.

  logger.info({
    message: 'SES email config',
    detail: `From Email Address: ${getFromEmailAddress()} , To: ${to} , Subject: ${subject} `,
  });

  const command = new SendEmailCommand({
    FromEmailAddress: getFromEmailAddress(),
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: buildSimpleContent({
        subject,
        text,
        html,
      }),
    },
  });

  try {
    const output = await getClient().send(command);

    if (!output.MessageId) {
      throw new ApplicationError({
        message: 'Failed to send email',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
      });
    }

    logger.success({
      message: 'SES accepted email',
      detail: `Message ID: ${output.MessageId}; Request ID: ${output.$metadata.requestId ?? 'unavailable'}; HTTP status: ${String(output.$metadata.httpStatusCode ?? 'unavailable')}`,
    });

    return { messageId: output.MessageId };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    logger.fail({ message: 'Failed to send email', error });

    if (error instanceof Error) {
      throw new ApplicationError({
        message: 'Failed to send email',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }

    throw error;
  }
};

export const SesCollection = {
  sendEmail,
};
