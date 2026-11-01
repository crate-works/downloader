/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

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
      // Externalise yazl and buffer-crc32 to avoid CJS/ESM interop issues where
      // Rollup wraps buffer-crc32's default export in a namespace object, breaking
      // crc32.unsigned() calls
      rollupConfig: {
        external: ['yazl', 'buffer-crc32'],
      },
    }),
  ],
  test: {
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
