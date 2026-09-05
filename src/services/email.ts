import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export const sendCommonEmail = async (to: string[], subject: string, body: string) => {
  const command = new SendEmailCommand({
    Source: process.env.AWS_SENDER!,
    Destination: {
      ToAddresses: to
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: body,
          Charset: 'UTF-8'
        }
      }
    }
  });

  try {
    const response = await sesClient.send(command);
    console.log('Email sent!', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    return error;
  }
};