# Porting guide: reference → Astro

The approved site is `reference/index.html` (one file, hash router, both languages inline).
Production renders one language per page at real routes. These rules keep the two identical.

## Ground truth

- `reference/index.html` is the specification. Its whitespace between inline elements is part
  of the rendering, so when in doubt check the compact original, not a pretty-printed copy.
- Never retype a string. Copy it from the reference. Never translate, reword or "fix" anything.
- Bracketed placeholders such as `[Selected line from …]` stay exactly as they are and are
  listed in `OPEN-ITEMS.md`.

## Where things live

| Concern            | Location                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| One page body      | `src/components/pages/<Name>Page.astro` (wraps `Base`)                                     |
| Route files        | `src/pages/<slug>.astro` and `src/pages/pa/<slug>.astro` (3 lines each)                    |
| Strings            | `src/content/i18n/en.json` + `pa.json`, nested by page: `home.hero.title`                  |
| Structured content | `src/content/<thing>.json` (locations, programs, milestones, …)                            |
| Photos             | `src/assets/images/*.webp`, resolved by file name via `image('name.webp')`                 |
| Behaviour          | `src/scripts/*.ts`; page-specific scripts are imported from the page component             |
| CSS                | `src/styles/*.css`, ported verbatim. Add new rules only to `overrides.css`, with a comment |

## Building blocks

```astro
---
import Base from '@/layouts/Base.astro';
import T from '@/components/T.astro'; // <T k="home.hero.title" />  → <span class="l-en">…</span>
import Photo from '@/components/Photo.astro'; // <Photo src={image('x.webp')} alt={t(locale,'…')} style="…" />
import NextBand from '@/components/NextBand.astro';
import { getLocale, localePath, t } from '@/lib/i18n';
import { image } from '@/lib/images';
const locale = getLocale(Astro.currentLocale); // 'en' | 'pa'
---
```

- `<T k="…" />` renders the string for the page language inside the same `.l-en` / `.l-pa`
  span the reference used, so every CSS selector still matches. Where the reference had
  `<span class="l-en">A</span><span class="l-pa" lang="pa">B</span>`, write one `<T />`.
- Attributes (`alt`, `aria-label`, `placeholder`) use `t(locale, 'key')` directly. The
  reference stores the Punjabi value in `data-pa-alt` and friends; both go into the JSON.
- `<Photo>` renders AVIF + WebP with a responsive `srcset`. Keep the reference's inline
  `style` on the `<img>` by passing `style="…"`. Pass `loading="eager"` for the first
  image in the viewport of a page.
- Inline `style="…"` attributes from the reference are kept as they are. Do not move them
  into classes; that is a later clean-up and a parity risk now.

## Links and anchors

| Reference                              | Production                                            |
| -------------------------------------- | ----------------------------------------------------- |
| `href="#/our-work"`                    | `href={localePath(locale, '/our-work/')}`             |
| `href="#/our-work/locations"`          | `href={localePath(locale, '/our-work/#locations')}`   |
| `id="our-work-locations"` on a section | `id="locations"` (the page prefix goes away)          |
| `href="#/"`                            | `href={localePath(locale, '/')}`                      |
| external, `mailto:`, `tel:`            | unchanged, including `target="_blank" rel="noopener"` |

## Strings in JSON

- Use a namespace per page (`home`, `ourStory`, `ourWork`, `impact`, `futureVision`,
  `joinTheSewa`, `contact`) and short, meaningful keys: `home.hero.kicker`, `home.stats.meals.label`.
- Repeated content (programs, milestones, locations, videos, FAQ) goes into a structured JSON
  under `src/content/` with `en`/`pa` fields per item, and the component maps over it.
- `class="notr"` strings (bank details, cheque payee, postal address) are identical in both
  languages; still put them in both JSON files.

## Scripts

Site-wide behaviour (menu, lightbox, copy buttons, video toggle, galleries, contact form,
language) is already wired in `src/scripts/init.ts` and expects these hooks:

- Lightbox: any `<img>` inside `.ph-img` that is not inside an `<a>`.
- Kitchen gallery: `.kgal[data-active]` containing `.kmain-img` and `.kthumb` buttons; each
  `.kthumb` carries `data-full="<url>"` (use `getImage()` from `astro:assets` for the URL).
- Copy buttons: `<button class="copy" data-copy="value" data-copied="Copied-in-page-language">Copy</button>`.
- Video toggle: a `.vgrid` followed by `.vmore` containing `[data-vmore]`.
- Contact form: `<form id="contact-form" data-email data-msg-invalid data-msg-sent>` and `#form-note`.
- Locations map: `src/scripts/map.ts` (page-specific, imported by the Our Work page).

## Checking a page

```bash
pnpm build
node tests/content/parity.mjs our-work         # every reference string present, both languages
node tests/visual/compare.mjs our-work         # ≤ 1.5% pixels, height within 2%, 4 pairs
open tests/visual/__diff__/our-work-en-desktop-diff.png
```

Iterate until both pass for EN and PA at desktop and mobile.
