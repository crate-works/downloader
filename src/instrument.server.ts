import * as Sentry from '@sentry/tanstackstart-react';
import { sentryConfig } from '#/server/services/sentry.ts';

if (sentryConfig) {
  Sentry.init(sentryConfig);
}
