/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

// Nitro rebundles Vite's SSR output without reading its source maps, leaving
// the final server maps empty. Hand the existing maps to the bundler.
const chainServiceSourcemaps = {
  name: 'chain-service-sourcemaps',
  load(id: string) {
    if (!id.includes('/.nitro/vite/services/') || !existsSync(`${id}.map`)) {
      return null;
    }

    return { code: readFileSync(id, 'utf8'), map: readFileSync(`${id}.map`, 'utf8') };
  },
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  base: process.env.NITRO_APP_BASE_URL,
  plugins: [
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
    tailwindcss(),
    nitro({
      sourcemap: true,
      // Externalise yazl and buffer-crc32 to avoid CJS/ESM interop issues where
      // Rollup wraps buffer-crc32's default export in a namespace object, breaking
      // crc32.unsigned() calls
      rollupConfig: {
        external: ['yazl', 'buffer-crc32'],
        plugins: [chainServiceSourcemaps],
      },
    }),
  ],
  test: {
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
