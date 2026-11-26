# Open items: Our Story (`/our-story/`, `/pa/our-story/`)

Reference: `reference/index.html`, `<main id="page-our-story">`. No bracketed placeholders exist on this page.

## Authored (not in the reference)

- `ourStory.meta.description` (EN and PA) is new. It is assembled only from phrases already on the page
  (kicker, journey heading, section kickers). Review before launch.

## Decisions that could not be reproduced one for one

- The reference's `.kmain-img` is empty markup (`src=""`) filled by JavaScript on load. Production renders the
  first photo server-side via `<Photo>` and each `.kthumb` carries `data-full` (full-size WebP URL from
  `getImage()`), so the page is complete without JS and the lightbox shows full-size photos.
- `aria-pressed` is not in the reference markup; the reference's `set(0)` adds it on load. Production renders
  `aria-pressed="true"` on the first thumb and `"false"` on the others, matching the post-load DOM.
- The reference's `data-en-alt` / `data-pa-alt` / `data-en-aria-label` / `data-pa-aria-label` attributes are
  language-switch hooks; production renders one language per page, so they are dropped. Both values live in
  `src/content/kitchens.json` and `src/content/i18n/parts/ourStory.*.json`.
- The hero painting is `loading="lazy"` in the reference; production uses `loading="eager"` with
  `fetchpriority="high"` because it is the first image in the viewport.
- The timeline entry "2020" has no `.l-en` / `.l-pa` wrapper in the reference (same text in both languages).
  Production stores it as `{ "en": "2020", "pa": "2020" }` in `src/content/milestones.json` and renders it bare,
  as the reference does, whenever `en === pa`.
- Colours and quotes in inline styles follow the compact original (`#E7E3D8`, `'Newsreader'`), not the
  pretty-printed copy.

## Shared-file notes

- `src/content/milestones.json` holds the Our Story timeline under `journey`; the Impact page is expected to
  add `impact` to the same file. Confirm neither agent overwrote the other's key before launch.

## Test-harness interaction (shared files, not changed here)

- `node tests/visual/compare.mjs our-story` with no language filter reports PA at 13.8% (desktop) and 29.0%
  (mobile) because `src/scripts/lang.ts` remembers the page language in `localStorage` (`dgrls-lang`) and, on a
  direct visit with no same-origin referrer, redirects to the remembered language. `compare.mjs` shoots EN first
  and PA second in one browser context, so the PA screenshot is the EN page (`our-story-pa-*-site.png` is
  byte-identical to `our-story-en-*-site.png`). Run per language (`… our-story en`, `… our-story pa`) and all
  four pairs pass; a one-line fix is a fresh `browser.newContext()` per language in `compare.mjs`.
