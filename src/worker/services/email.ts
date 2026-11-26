import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createTransport, type Transporter } from 'nodemailer';
import { config } from '#/server/services/config.ts';

const createMailTransport = (): Transporter => {
  if (!config.SMTP_URL) {
    return createTransport({ SES: { sesClient: new SESv2Client({ region: config.AWS_REGION }), SendEmailCommand } });
  }

  const { protocol, username } = new URL(config.SMTP_URL);

  return createTransport({
    url: config.SMTP_URL,
    // Never send credentials in plain text; nodemailer otherwise only upgrades when the server offers STARTTLS.
    requireTLS: protocol === 'smtp:' && username !== '',
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
  });
};

const transport = createMailTransport();

type MissingFile = {
  filename: string;
  error: string;
};

type SendDownloadEmailParams = {
  to: string;
  downloadUrl?: string;
  fileCount: number;
  totalSize: string;
  missingFiles?: MissingFile[] | undefined;
};

const buildMissingFilesHtml = (missingFiles: MissingFile[]): string => `
  <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0;">
    <h2 style="color: #dc2626; margin-top: 0; font-size: 16px;">
      Warning: ${missingFiles.length} file${missingFiles.length !== 1 ? 's' : ''} could not be downloaded
    </h2>
    <ul style="margin: 8px 0; padding-left: 20px;">
      ${missingFiles.map((f) => `<li><strong>${f.filename}</strong> — ${f.error}</li>`).join('\n      ')}
    </ul>
    <p style="color: #666; font-size: 14px; margin-bottom: 0;">
      Please try submitting a new export request for these files. If the problem
      persists, the files may be temporarily unavailable.
    </p>
  </div>`;

const buildMissingFilesText = (missingFiles: MissingFile[]): string => {
  const lines = [
    `WARNING: ${missingFiles.length} file${missingFiles.length !== 1 ? 's' : ''} could not be downloaded:`,
    '',
    ...missingFiles.map((f) => `  - ${f.filename}: ${f.error}`),
    '',
    'Please try submitting a new export request for these files.',
    'If the problem persists, the files may be temporarily unavailable.',
  ];

  return lines.join('\n');
};

export const sendDownloadEmail = async ({ to, downloadUrl, fileCount, totalSize, missingFiles }: SendDownloadEmailParams): Promise<void> => {
  const allFailed = !downloadUrl;
  const hasMissing = missingFiles && missingFiles.length > 0;

  const subject = allFailed ? 'Your download could not be completed' : 'Your download is ready';

  const htmlBody = allFailed
    ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #dc2626;">Download Failed</h1>

  <p>We were unable to download any of the <strong>${fileCount} file${fileCount !== 1 ? 's' : ''}</strong> you requested.</p>

  ${hasMissing ? buildMissingFilesHtml(missingFiles) : ''}

  <p>Please try submitting a new export request. If the problem persists, the files may be temporarily unavailable.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

  <p style="color: #999; font-size: 12px;">
    Collections Downloader
  </p>
</body>
</html>`
    : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #2563eb;">Your Download is Ready</h1>

  <p>Your requested download containing <strong>${fileCount} file${fileCount !== 1 ? 's' : ''}</strong> (${totalSize}) is ready.</p>

  <p style="margin: 24px 0;">
    <a href="${downloadUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 6px; display: inline-block;">
      Download Files
    </a>
  </p>

  ${hasMissing ? buildMissingFilesHtml(missingFiles) : ''}

  <p style="color: #666; font-size: 14px;">
    This link will expire in 24 hours. If you need to download the files again
    after the link expires, please submit a new export request.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

  <p style="color: #999; font-size: 12px;">
    Collections Downloader
  </p>
</body>
</html>`;

  const textBody = allFailed
    ? [
        'Download Failed',
        '',
        `We were unable to download any of the ${fileCount} file${fileCount !== 1 ? 's' : ''} you requested.`,
        '',
        ...(hasMissing ? [buildMissingFilesText(missingFiles), ''] : []),
        'Please try submitting a new export request.',
        'If the problem persists, the files may be temporarily unavailable.',
      ].join('\n')
    : [
        'Your Download is Ready',
        '',
        `Your requested download containing ${fileCount} file${fileCount !== 1 ? 's' : ''} (${totalSize}) is ready.`,
        '',
        `Download link: ${downloadUrl}`,
        '',
        ...(hasMissing ? [buildMissingFilesText(missingFiles), ''] : []),
        'This link will expire in 24 hours.',
      ].join('\n');

  await transport.sendMail({ from: config.EMAIL_FROM, to, subject, html: htmlBody.trim(), text: textBody.trim() });
};
