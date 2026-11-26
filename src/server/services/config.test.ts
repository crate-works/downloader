import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadConfig = async (smtpUrl: string | undefined) => {
  vi.resetModules();
  vi.stubEnv('SMTP_URL', smtpUrl);
  const { config } = await import('./config.ts');

  return config;
};

describe('SMTP_URL validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  it.each(['smtp://relay.example.org:587', 'smtps://you%40gmail.com:app-password@smtp.gmail.com:465'])('accepts %s', async (url) => {
    expect((await loadConfig(url)).SMTP_URL).toBe(url);
  });

  it('treats an empty value as unset', async () => {
    expect((await loadConfig('')).SMTP_URL).toBeUndefined();
  });

  it.each(['http://relay.example.org', 'not a url'])('fails start-up for %s', async (url) => {
    await expect(loadConfig(url)).rejects.toThrow('process.exit(1)');
  });
});
