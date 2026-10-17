// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://langarsewa.org',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' }, // one stylesheet, inlined: removes a render-blocking request on slow mobile
  compressHTML: false,
  // Old addresses. On Cloudflare Pages public/_redirects answers with 301s; on GitHub Pages these
  // generate small HTML pages with a meta refresh and a canonical link, so the links keep working.
  redirects: {
    '/about': '/our-story/',
    '/sewa': '/our-work/',
    '/media-gallery': '/impact/',
    '/donate': '/join-the-sewa/',
    '/covid': '/join-the-sewa/',
    '/punjabi': '/pa/',
  }, // whitespace between inline elements is part of the approved rendering
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
