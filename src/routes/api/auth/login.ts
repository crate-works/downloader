import { createFileRoute } from '@tanstack/react-router';
import { config } from '#/server/services/config.ts';
import { type CookieOptions, cookiePath, serializeCookie } from '#/server/services/cookies.ts';
import { generateState, getAuthorizationUrl } from '#/server/services/oidc.ts';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  path: cookiePath,
  maxAge: 600,
};

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      GET: async () => {
        const state = generateState();
        const authUrl = await getAuthorizationUrl(state);

        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl,
            'Set-Cookie': serializeCookie('oauth_state', state, cookieOptions),
          },
        });
      },
    },
  },
});
