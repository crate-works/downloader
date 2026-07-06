import { getRequest } from '@tanstack/react-start/server';
import { appPath } from '#/shared/paths.ts';

type CookieOptions = {
  httpOnly?: boolean | undefined;
  secure?: boolean | undefined;
  sameSite?: 'strict' | 'lax' | 'none' | undefined;
  path?: string | undefined;
  maxAge?: number | undefined;
  domain?: string | undefined;
};

/**
 * Cookie Path scoped to the app's base path so instances hosted at
 * different subpaths of the same domain don't share auth cookies.
 * Cookies use the bare path, without the trailing slash appPath carries.
 */
export const cookiePath = appPath().replace(/\/$/, '') || '/';

/**
 * Parse cookies from a Cookie header string
 */
const parseCookies = (cookieHeader: string): Record<string, string> => {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });

  return cookies;
};

/**
 * Serialize a cookie to a Set-Cookie header value
 */
export const serializeCookie = (name: string, value: string, options: CookieOptions = {}): string => {
  const parts: string[] = [`${name}=${value}`];

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`);
  }

  return parts.join('; ');
};

/**
 * Get a cookie value from the current request (for use in server functions)
 */
export const getCookie = (name: string): string | undefined => {
  const request = getRequest();
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);

  return cookies[name];
};

/**
 * Get a cookie value from a Request object (for use in server route handlers)
 */
export const getCookieFromRequest = (request: Request, name: string): string | undefined => {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);

  return cookies[name];
};

export type { CookieOptions };
