// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Served from a custom domain at the apex of the subdomain, so `base` stays '/'.
// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://downloader.crate-works.org',
  base: '/',
  vite: {
    plugins: [tailwindcss()],
  },
});
