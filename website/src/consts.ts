// Single source of truth for cross-page values. Update VERSION when the app
// releases (it mirrors the root package.json version).
export const SITE_NAME = 'Collection Downloader';
export const SITE_TAGLINE = 'Browse RO-Crate archives and download what you need, by email.';
export const SITE_DESCRIPTION =
  'A web app for browsing RO-Crate collections hierarchically, filtering files by quality tier, and requesting zip downloads delivered via email. Built for PARADISEC and other RO-Crate archives.';

export const DOMAIN = 'downloader.crate-works.org';
export const GITHUB_URL = 'https://github.com/crate-works/downloader';
export const DOCKER_IMAGE = 'ghcr.io/crate-works/downloader';
export const APP_VERSION = '1.10.0';
export const PARADISEC_URL = 'https://www.paradisec.org.au';
export const ROCRATE_URL = 'https://www.researchobject.org/ro-crate/';
export const ROCRATE_API_URL = 'https://language-research-technology.github.io/ro-crate-api/';

export const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/guide/', label: 'User guide' },
  { href: '/self-hosting/', label: 'Self-hosting' },
] as const;
