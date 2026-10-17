# langarsewa.org

Production website for **Dhan Guru Ramdas Langar Sewa**: free, nutritious Langar for
hospitals, schools and communities across Punjab, with healthcare and community programs.
English and Punjabi, static, hosted on Cloudflare Pages.

- Production: https://langarsewa.org
- Stack: [Astro](https://astro.build) (static output), TypeScript, plain CSS, self-hosted
  fonts, responsive AVIF/WebP images. No client framework, no third-party runtime calls.

## Run it

```bash
pnpm install          # Node 24 (see .nvmrc), pnpm 10
pnpm dev              # http://localhost:4321
pnpm build            # dist/
pnpm preview
```

## Edit content

Words, photos, bank details, locations and videos live in `src/content/`; see
[CONTRIBUTING.md](./CONTRIBUTING.md) for the three-step recipes. No component changes are
needed for everyday edits.

## How it is built

| Folder                  | What is in it                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/pages/`            | One file per route; `pa/` holds the Punjabi routes. Each renders a page component.                       |
| `src/components/pages/` | The seven page bodies.                                                                                   |
| `src/components/`       | Shared pieces: header, footer, lightbox, language switch, `T` (translated string), `Photo`.              |
| `src/content/`          | `site.json`, `i18n/en.json`, `i18n/pa.json`, and one JSON per list (locations, programs, milestones, …). |
| `src/styles/`           | The approved stylesheet, split by area and imported in order from `global.css`.                          |
| `src/scripts/`          | Small TypeScript modules: menu, lightbox, map, galleries, copy buttons, contact form, language memory.   |
| `public/`               | `_headers` (CSP and security headers), `_redirects` (old URLs), `robots.txt`, favicon, OG image.         |
| `reference/`            | The approved design, kept only for the parity tests. Never served.                                       |
| `tests/`                | Content, i18n, link, interaction, accessibility and visual-parity tests.                                 |

### Routes

| Page          | English           | Punjabi              |
| ------------- | ----------------- | -------------------- |
| Home          | `/`               | `/pa/`               |
| Our Story     | `/our-story/`     | `/pa/our-story/`     |
| Our Work      | `/our-work/`      | `/pa/our-work/`      |
| Impact        | `/impact/`        | `/pa/impact/`        |
| Future Vision | `/future-vision/` | `/pa/future-vision/` |
| Join the Sewa | `/join-the-sewa/` | `/pa/join-the-sewa/` |
| Contact       | `/contact/`       | `/pa/contact/`       |

Old addresses (`/about`, `/donate`, `/#/impact/milestones`, `?lang=pa`) keep working through
`public/_redirects` and a small redirect script on the home page.

### Language

Each page is rendered once per language with the right `<html lang>`, `hreflang` alternates
and canonical URL. The `EN | ਪੰਜਾਬੀ` control links to the same page in the other language and
remembers the choice in the browser.

## Tests

```bash
pnpm check            # astro check (TypeScript)
pnpm lint             # ESLint + Prettier
pnpm test:content     # i18n key parity + every reference string present in the build
pnpm test:links       # no broken internal links or anchors
pnpm test:e2e         # Playwright interaction tests
pnpm test:a11y        # axe-core on every route, both languages
pnpm test:visual      # 28 screenshot pairs against reference/ (≤1.5% pixels, ≤2% height)
pnpm lhci             # Lighthouse CI budgets (mobile)
```

Playwright needs its browser once: `pnpm exec playwright install chromium`.

## Deploys

Every push to `main` deploys to production through Cloudflare Pages' Git integration; every
pull request gets a preview URL. Build command `pnpm build`, output `dist`, `NODE_VERSION`
from `.nvmrc`. CI (`.github/workflows/ci.yml`) must be green before merging.

## Analytics and donations

Both are prepared and off. `src/content/site.json`:

- `analytics.enabled` + `analytics.cloudflareToken` turn on Cloudflare Web Analytics
  (`src/lib/analytics.ts` names the events; they no-op while off). When enabling, add
  `https://static.cloudflareinsights.com` to `script-src` and `connect-src` in `public/_headers`.
- `donations.india.paymentPageUrl` / `donations.international.paymentPageUrl` show a
  "Donate online" button on Join the Sewa that links to the gateway's hosted page.

## License

All rights reserved, Dhan Guru Ramdas Langar Sewa. See [LICENSE](./LICENSE).
