# Open items: Future Vision (`/future-vision/`, `/pa/future-vision/`)

Reference: `reference/index.html`, `<main id="page-future-vision">` (compact lines 378–380).

## Bracketed placeholders

None. The page has no `[…]` placeholder text in either language.

## Decisions taken while porting

1. **Timeline, legend, projects and chips live in `src/content/projects.json`.** The 2034 hospital
   block has no list-like content (kicker, year, title, two paragraphs, one photo), so its strings
   are in `futureVision.hospital.*` and only its photo and alt text are in `projects.json`.
2. **Chip styles are a variant map in the component** (`development`, `planned`, `service`, `tag`)
   with the reference's inline style strings copied verbatim, rather than style strings in JSON.
3. **Kitchen gallery is rendered as the reference's JavaScript leaves it after load:** the main
   `<img class="kmain-img">` carries photo 0's src and alt, `data-active="0"`, the first `.kthumb`
   has `class="kthumb on"` and `aria-pressed="true"`, the second `aria-pressed="false"`. Each
   `.kthumb` carries `data-full` (full-size WebP URL from `getImage()`), which equals the main
   image's `src`, so `src/scripts/gallery.ts` does not swap the image on load.
4. **Dropped language-switch attributes** (`data-en-alt`, `data-pa-alt`, `data-en-aria-label`,
   `data-pa-aria-label`, `data-i` kept) because production renders one language per page; the
   Punjabi values are in `projects.json` under `alt.pa` and reach `alt` / `aria-label` on `/pa/`.
5. **The first photo on the page (gallery main image) is `loading="eager"`.** No image sits in the
   first viewport on either breakpoint; the hero and timeline are text. Harmless, and it matches the
   brief ("render the main image server-side as the first photo").
6. **Thumbnails are rendered through `<Photo>` at 320/640 px** with `sizes="(max-width: 700px) 20vw, 120px"`;
   the reference loaded the full-size file into each ~100 px thumb.
7. **Meta descriptions** (`futureVision.meta.description`) are new strings composed only from phrases
   already on the page, per the brief; the reference had none for this page.
8. **YouTube link** uses `site.social.youtube`, whose value is identical to the reference's literal URL.

## Not reproducible / harness

- `tests/visual/compare.mjs` shares one Playwright context across all shots, so `initLang()`
  rule 2 (direct visit opens the remembered language) redirects `/pa/future-vision/` to the English
  page after the English shot stored `dgrls-lang=en`. The PA pairs fail at 26–34% for that reason
  alone. With a fresh context per shot all four pairs pass (see the diff proposed in the port report).
  This affects every page's PA pairs, not only this one.

## Residual visual difference (within limits)

Desktop 0.28% (EN) / 0.35% (PA), mobile 0.17% / 0.18%: photo resampling (AVIF/WebP transforms at
responsive widths versus the reference's single WebP) and sub-pixel glyph differences. No layout or
height difference; all four heights match exactly.
