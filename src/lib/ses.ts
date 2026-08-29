import { SendEmailCommand, SESv2Client, SESv2ServiceException } from '@aws-sdk/client-sesv2';
import validator from 'validator';
import { ApplicationErrorConstantsCollection } from './application-error.constants.ts';
import { ApplicationError } from './application-error.ts';
import { maskEmailAddress } from './email-address.ts';
import { logger } from './logger.ts';
import { SesConstantsCollection } from './ses.constants.ts';
import type { SesTypeCollection } from './ses.types.ts';

let sesClient: SESv2Client | undefined;

interface SesConfig {
  fromEmailAddress: string;
  region: string;
}

interface GetClientInput {
  region: string;
}

interface SesMetadataInput {
  httpStatusCode?: number;
  requestId?: string;
}

const getSesConfig = (): SesConfig => {
  const region = process.env['AWS_REGION'];

  if (!region) {
    throw new ApplicationError({
      message: 'AWS_REGION is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  const fromEmailAddress = process.env['SES_FROM_EMAIL'];

  if (!fromEmailAddress) {
    throw new ApplicationError({
      message: 'SES_FROM_EMAIL is required',
      statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return { fromEmailAddress, region };
};

// Amazon Simple Email Service (SES) is the AWS API that sends email.
// Built on first use so `loadLocalEnv()` has already copied `.env` into `process.env`.
// No access keys: the AWS SDK reads the IAM role attached to this EC2 instance.
const getClient = ({ region }: GetClientInput): SESv2Client => {
  if (sesClient) {
    return sesClient;
  }

  sesClient = new SESv2Client({
    region,
  });

  return sesClient;
};

const formatSesMetadata = ({ httpStatusCode, requestId }: SesMetadataInput): string => {
  return `awsRequestId=${requestId ?? 'unavailable'} httpStatus=${String(httpStatusCode ?? 'unavailable')}`;
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
  const { fromEmailAddress, region } = getSesConfig();

  logger.info({
    message: 'Sending email with SES',
    detail: `region=${region} from=${fromEmailAddress} to=${maskEmailAddress({ email: to })}`,
  });

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmailAddress,
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
    const output = await getClient({ region }).send(command);

    if (!output.MessageId) {
      logger.fail({
        message: 'SES response missing message ID',
        detail: formatSesMetadata(output.$metadata),
      });
      throw new ApplicationError({
        message: 'Failed to send email',
        statusCode: ApplicationErrorConstantsCollection.HttpStatusCode.INTERNAL_SERVER_ERROR,
      });
    }

    logger.success({
      message: 'SES accepted email',
      detail: `sesMessageId=${output.MessageId} ${formatSesMetadata(output.$metadata)}`,
    });

    return { messageId: output.MessageId };
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    if (error instanceof SESv2ServiceException) {
      logger.fail({
        message: 'SES request failed',
        detail: formatSesMetadata(error.$metadata),
      });
    } else {
      // SDK errors can echo input values, so keep this failure generic instead of risking email PII.
      logger.fail({ message: 'SES request failed' });
    }

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
