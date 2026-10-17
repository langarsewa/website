// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://langarsewa.org',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  compressHTML: false, // whitespace between inline elements is part of the approved rendering
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pa'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', pa: 'pa' } },
      filter: (page) => !page.endsWith('/404/'),
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
