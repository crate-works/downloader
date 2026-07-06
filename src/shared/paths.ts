/**
 * Build an app-absolute URL path from a segment relative to the app's base.
 * BASE_URL is inlined at build time, always carries a trailing slash, and is
 * rewritten at container start when the app is deployed under a subpath, so
 * segments must be appended without a leading slash.
 */
export const appPath = (path = ''): string => import.meta.env.BASE_URL + path.replace(/^\//, '');
