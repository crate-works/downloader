import type { AddressInfo } from 'node:net';
import { type ParsedMail, simpleParser } from 'mailparser';
import { SMTPServer, type SMTPServerSession } from 'smtp-server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sesSend = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: class {
    send = sesSend;
  },
  SendEmailCommand: class {
    constructor(readonly input: unknown) {}
  },
}));

type SesRawCommand = {
  input: { FromEmailAddress: string; Destination: { ToAddresses: string[] }; Content: { Raw: { Data: Buffer } } };
};

const readyEmail = {
  to: 'user@example.com',
  downloadUrl: 'https://bucket.example.com/export.zip',
  fileCount: 3,
  totalSize: '1.2 MB',
};

const loadSendDownloadEmail = async (smtpUrl?: string) => {
  vi.resetModules();
  vi.stubEnv('SMTP_URL', smtpUrl);
  const { sendDownloadEmail } = await import('./email.ts');

  return sendDownloadEmail;
};

const startSmtpServer = async ({ startTls = false } = {}) => {
  const received: { mail: ParsedMail; session: Pick<SMTPServerSession, 'user' | 'envelope'> }[] = [];
  const state = { rejectNextWith: undefined as string | undefined };
  const server = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: startTls ? [] : ['STARTTLS'],
    logger: false,
    onAuth: (auth, _session, callback) => callback(null, { user: auth.username }),
    onData: (stream, session, callback) => {
      simpleParser(stream).then((mail) => {
        received.push({ mail, session: structuredClone({ user: session.user, envelope: session.envelope }) });
        callback(state.rejectNextWith ? Object.assign(new Error(state.rejectNextWith), { responseCode: 550 }) : null);
      }, callback);
    },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.server.address() as AddressInfo;

  return { port, received, state, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
};

describe('sendDownloadEmail', () => {
  beforeEach(() => {
    sesSend.mockReset().mockResolvedValue({ MessageId: 'ses-message-id' });
  });

  describe('without SMTP_URL', () => {
    it.each([undefined, ''])('sends through SES when SMTP_URL is %j', async (smtpUrl) => {
      const sendDownloadEmail = await loadSendDownloadEmail(smtpUrl);
      await sendDownloadEmail(readyEmail);

      expect(sesSend).toHaveBeenCalledOnce();
      const [{ input }] = sesSend.mock.calls[0] as [SesRawCommand];
      expect(input.FromEmailAddress).toBe('noreply@example.com');
      expect(input.Destination.ToAddresses).toEqual(['user@example.com']);
      const mail = await simpleParser(input.Content.Raw.Data);
      expect(mail.from?.text).toBe('noreply@example.com');
      expect(mail.subject).toBe('Your download is ready');
      expect(mail.html).toContain('href="https://bucket.example.com/export.zip"');
      expect(mail.text).toContain('Download link: https://bucket.example.com/export.zip');
    });
  });

  it('rejects when SES refuses the message', async () => {
    sesSend.mockRejectedValue(new Error('Email address is not verified'));
    const sendDownloadEmail = await loadSendDownloadEmail();

    await expect(sendDownloadEmail(readyEmail)).rejects.toThrow('Email address is not verified');
  });

  describe('with SMTP_URL', () => {
    let smtp: Awaited<ReturnType<typeof startSmtpServer>>;

    beforeEach(async () => {
      smtp = await startSmtpServer();
    });

    afterEach(async () => {
      await smtp.close();
    });

    it('sends the download-ready email over SMTP instead of SES', async () => {
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://127.0.0.1:${smtp.port}`);
      await sendDownloadEmail(readyEmail);

      expect(sesSend).not.toHaveBeenCalled();
      expect(smtp.received).toHaveLength(1);
      const [{ mail, session }] = smtp.received as [(typeof smtp.received)[number]];
      expect(session.envelope.mailFrom).toMatchObject({ address: 'noreply@example.com' });
      expect(session.envelope.rcptTo).toMatchObject([{ address: 'user@example.com' }]);
      expect(mail.from?.text).toBe('noreply@example.com');
      expect(mail.subject).toBe('Your download is ready');
      expect(mail.html).toContain('href="https://bucket.example.com/export.zip"');
      expect(mail.html).toContain('<strong>3 files</strong> (1.2 MB)');
      expect(mail.text).toContain('Download link: https://bucket.example.com/export.zip');
    });

    it('logs in over STARTTLS with a percent-encoded Gmail-style username decoded', async () => {
      await smtp.close();
      smtp = await startSmtpServer({ startTls: true });
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://you%40gmail.com:app-password@127.0.0.1:${smtp.port}?tls.rejectUnauthorized=false`);
      await sendDownloadEmail(readyEmail);

      expect(smtp.received[0]?.session.user).toBe('you@gmail.com');
    });

    it('refuses to send credentials over smtp:// when the server lacks STARTTLS', async () => {
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://user:secret@127.0.0.1:${smtp.port}`);

      await expect(sendDownloadEmail(readyEmail)).rejects.toThrow();
      expect(smtp.received).toHaveLength(0);
    });

    it('rejects when the SMTP server refuses the message', async () => {
      smtp.state.rejectNextWith = 'Mailbox unavailable';
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://127.0.0.1:${smtp.port}`);

      await expect(sendDownloadEmail(readyEmail)).rejects.toThrow('Mailbox unavailable');
    });

    it('sends the download-ready email with the missing files listed', async () => {
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://127.0.0.1:${smtp.port}`);
      await sendDownloadEmail({ ...readyEmail, missingFiles: [{ filename: 'Ŋarra-ŋäṟa.wav', error: 'Not found' }] });

      const mail = smtp.received[0]?.mail;
      expect(mail?.subject).toBe('Your download is ready');
      expect(mail?.html).toContain('href="https://bucket.example.com/export.zip"');
      expect(mail?.html).toContain('Warning: 1 file could not be downloaded');
      expect(mail?.text).toContain('  - Ŋarra-ŋäṟa.wav: Not found');
    });

    it('sends the all-failed email with the missing files listed', async () => {
      const sendDownloadEmail = await loadSendDownloadEmail(`smtp://127.0.0.1:${smtp.port}`);
      await sendDownloadEmail({
        to: 'user@example.com',
        fileCount: 1,
        totalSize: '0 B',
        missingFiles: [{ filename: 'Ŋarra-ŋäṟa.wav', error: 'Not found' }],
      });

      const mail = smtp.received[0]?.mail;
      expect(mail?.subject).toBe('Your download could not be completed');
      expect(mail?.html).toContain('<strong>Ŋarra-ŋäṟa.wav</strong> — Not found');
      expect(mail?.text).toContain('  - Ŋarra-ŋäṟa.wav: Not found');
    });
  });
});
