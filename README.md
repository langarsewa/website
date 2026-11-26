# langarsewa.org

Production website for **Dhan Guru Ramdas Langar Sewa**: free, nutritious Langar for
hospitals, schools and communities across Punjab, with healthcare and community programs.
English and Punjabi, static, hosted on Cloudflare Pages.

- Production: https://www.langarsewa.org (Cloudflare Pages)
- Test site: https://dev.langarsewa.pages.dev
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

The Punjabi pages are currently **hidden** (`showPunjabi: false` in `src/content/site.json`):
they still build at `/pa/…` but carry `noindex`, and the language control and `hreflang` links
are not shown. Set it to `true` once the Punjabi review is done.

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

## Environments

| Where                                   | Built from              | Who sees it                              |
| --------------------------------------- | ----------------------- | ---------------------------------------- |
| https://www.langarsewa.org              | `main`                  | Everyone. Production.                    |
| https://dev.langarsewa.pages.dev        | `dev`                   | The team. Check every change here first. |
| https://\<branch\>.langarsewa.pages.dev | a pull request's branch | Reviewers of that one pull request.      |

Every deploy comes from CI (`.github/workflows/ci.yml`): it builds once, runs every gate (types,
lint, content and translation parity, links, redirects, interaction, accessibility, visual parity,
Lighthouse), and deploys only if all of them pass. A smoke test then runs against the deployed
URL. Nothing is deployed from a laptop. The `dev` and preview sites send `noindex`, so search
engines only ever see production.

## Releasing a change

Two steps: **dev first, then production.** Each push takes about 7 minutes to go live.

### 1. Put it on the test site

```bash
git switch dev && git pull
git switch -c content/what-changed      # a short name for the change
# … edit, then run the checks below …
git commit -am "Say what changed and why"
git push -u origin content/what-changed
```

On GitHub, open a pull request **into `dev`**. CI runs the gates and comments a preview link for
that branch alone. When it looks right, merge it. https://dev.langarsewa.pages.dev updates a few
minutes later. Check the change there, on a phone as well as a laptop.

For a small fix you can skip the pull request and push to `dev` directly:
`git push origin HEAD:dev`.

### 2. Promote dev to production

When the test site is right, open a pull request **`dev` → `main`** on GitHub and merge it once
the checks are green. Production updates about 7 minutes later. Or, from a laptop:

```bash
git switch main && git pull
git merge --ff-only origin/dev         # refuses if main has anything dev lacks
git push origin main
```

Then confirm on https://www.langarsewa.org (a phone on mobile data avoids stale caches).

### Checks before you push

```bash
pnpm check && pnpm lint && pnpm build && pnpm test:content && pnpm test:links
```

CI runs the full set either way; these catch most problems in a minute.

### Recommended once: protect `main`

GitHub → Settings → Branches → **Add rule** for `main`: require a pull request and require the
CI checks to pass. Today `main` accepts direct pushes, so the rule above is a habit, not a lock.

### If something goes wrong

[docs/rollback.md](./docs/rollback.md): one click in Cloudflare restores the previous
production deployment; `git revert` makes it stick.

## Hosting, domain and analytics

[docs/deploy-cloudflare.md](./docs/deploy-cloudflare.md) has the full picture. In short:

- **Hosting:** Cloudflare Pages project `langarsewa`.
- **Domain:** registered and DNS-managed at Squarespace. `www` is a CNAME to
  `langarsewa.pages.dev`; the bare domain redirects to www through Squarespace. Email is Google
  Workspace and independent of the site.
- **Analytics:** Cloudflare Web Analytics, switched on in the Cloudflare dashboard (Pages project
  → Metrics → Web Analytics). Cookie-free; the CSP already allows it.

## Donations

Prepared and off. `src/content/site.json` → `donations.india.paymentPageUrl` /
`donations.international.paymentPageUrl` show a "Donate online" button on Join the Sewa that links
to the gateway's hosted page.

## License

All rights reserved, Dhan Guru Ramdas Langar Sewa. See [LICENSE](./LICENSE).
