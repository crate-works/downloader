import * as Sentry from '@sentry/tanstackstart-react';
import { QueryClient } from '@tanstack/react-query';
import { createRouter, ErrorComponent } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen.ts';

export function getRouter() {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultErrorComponent: ErrorComponent,
    defaultOnCatch: (error, errorInfo) => Sentry.captureReactException(error, errorInfo),
  });

  if (!router.isServer) {
    Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router));
  }

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}
