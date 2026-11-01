/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Header } from '#/components/layout/Header.tsx';
import { getSentryConfig } from '#/server/functions/sentry.ts';
import '../styles.css';

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link to="/" className="text-primary hover:underline">
        Return home
      </Link>
    </div>
  );
}

// Escape '<' so the JSON can't close the inline script early
const serialiseForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export const Route = createRootRoute({
  loader: () => getSentryConfig(),
  staleTime: Number.POSITIVE_INFINITY,
  head: ({ loaderData }) => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: 'Collection Downloader' }],
    scripts: loaderData ? [{ children: `window.__SENTRY_CONFIG__=${serialiseForScript(loaderData)}` }] : [],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          <footer className="border-t py-4 text-center text-sm text-muted-foreground">Collection Downloader v{__APP_VERSION__}</footer>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
