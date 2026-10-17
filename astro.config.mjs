// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://control.langarsewa.org',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  vite: { build: { assetsInlineLimit: 0 } },
});
