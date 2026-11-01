import * as Sentry from '@sentry/tanstackstart-react';
import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

declare global {
  interface Window {
    __SENTRY_CONFIG__?: Parameters<typeof Sentry.init>[0];
  }
}

if (window.__SENTRY_CONFIG__) {
  Sentry.init(window.__SENTRY_CONFIG__);
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
