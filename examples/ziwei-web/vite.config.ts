import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const libraryVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'iztro-browser-version',
      transform(code, id) {
        if (id.endsWith('/src/version.ts')) {
          return `export const version = ${JSON.stringify(libraryVersion)};\n`;
        }
        return undefined;
      },
    },
  ],
  resolve: {
    alias: {
      iztro: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
