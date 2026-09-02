// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Served from a custom domain at the apex of the subdomain, so `base` stays '/'.
// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://downloader.crate-works.org',
  base: '/',
  // Astro 7 defaults to JSX whitespace rules, which drop the spaces around
  // inline <a>/<code>/<strong> inside prose. Keep the HTML-aware collapsing.
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
