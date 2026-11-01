import { createServerFn } from '@tanstack/react-start';
import { sentryConfig } from '#/server/services/sentry.ts';

export const getSentryConfig = createServerFn({ method: 'GET' }).handler(() => sentryConfig);
