# Changelog

## Nov 26, 2026: launch

- www.langarsewa.org now serves the new site from Cloudflare Pages. DNS and email stay at
  Squarespace and Google; only the `www` record changed. www is the canonical host.
- Mission widened to nutrition, healthcare and education.
- Interview videos on Impact (two self-hosted with byte-range support, one YouTube); logo removed;
  Instagram updated.
- CSP allows Cloudflare Web Analytics. Docs rewritten for the setup actually used; superseded
  plans moved to `docs/history/`; GitHub Pages `CNAME` removed.

## Unreleased

- Production rebuild of langarsewa.org: Astro static site with real routes in English and
  Punjabi, visual and content parity with the approved reference, self-hosted fonts,
  responsive AVIF/WebP images, strict CSP, legacy redirects, sitemap, structured data.
- Interactive locations map, kitchen galleries, lightbox, bank-detail copy buttons, contact
  form (opens the visitor's email app), language memory, old hash-link redirects.
- Test suite: i18n key parity, content parity, visual parity (28 screenshot pairs),
  interaction tests, axe accessibility, Lighthouse CI budgets, link check.
