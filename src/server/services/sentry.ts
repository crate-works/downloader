import type { BrowserOptions } from '@sentry/tanstackstart-react';
import { config } from '#/server/services/config.ts';

export const sentryConfig = config.SENTRY_DSN
  ? ({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
      release: __APP_VERSION__,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    } satisfies BrowserOptions)
  : undefined;
