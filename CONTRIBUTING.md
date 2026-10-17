# Editing the site

You do not need to touch components to change words, photos or details. Everything a sewadar
would edit lives under `src/content/`. A pull request builds a preview link automatically;
`main` deploys to langarsewa.org.

## Change a sentence

1. Find the English text in `src/content/i18n/en.json` (search for a few words of it).
2. Change the value, keeping the key. Change the same key in `src/content/i18n/pa.json`.
3. Open a pull request. CI fails if a key exists in one file and not the other, or is empty.

Bank details, phone numbers, email, address and social links are in `src/content/site.json`
and `src/content/bank-india.json`.

## Swap or add a photo

1. Export the photo as WebP, at least 1200 px wide, and put it in `src/assets/images/`
   with a descriptive file name (`langar-at-civil-hospital-ludhiana.webp`).
2. Point the content entry at the new file name (for example in `src/content/programs.json`
   or `src/content/kitchens.json`) and write the alt text in both languages.
3. The build produces AVIF and WebP at several sizes on its own.

## Locations, programs, milestones, videos, FAQ

Each is a JSON list under `src/content/`. Copy an existing entry, keep every field, fill both
languages. The Our Work map reads `locations.json`: `x` and `y` are coordinates inside the
map SVG; place a new pin by copying the nearest existing one and adjusting.

## Turn on the donation button

Paste the gateway's hosted payment page URL into `src/content/site.json` at
`donations.india.paymentPageUrl` (or `donations.international.paymentPageUrl`). The
"Donate online" button appears on the matching card on Join the Sewa. No other change.

## Translation review

Punjabi strings were extracted from the approved site, not machine-translated. Any new
Punjabi text should be reviewed by a native speaker before merging. Mark unreviewed strings
in the pull request description.

## Running locally

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build && pnpm preview
```

Node 24 and pnpm 10 (see `.nvmrc` and `package.json`). Checks before a pull request:

```bash
pnpm check && pnpm lint && pnpm build && pnpm test:content && pnpm test:links
```

Visual parity against `reference/` (`pnpm test:visual`) needs Playwright's Chromium:
`pnpm exec playwright install chromium`.
