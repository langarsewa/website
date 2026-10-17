# Open items: Home

Route `/` and `/pa/`. Page component `src/components/pages/HomePage.astro`.

## Bracketed placeholders (copied as is)

| Where                        | English                                                     | Punjabi                                                | Key                 |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | ------------------- |
| "Voices of the sangat" quote | `“[Selected line from Giani Pinderpal Singh Ji’s message]”` | `“[ਗਿਆਨੀ ਪਿੰਦਰਪਾਲ ਸਿੰਘ ਜੀ ਦੇ ਸੁਨੇਹੇ ਵਿੱਚੋਂ ਇੱਕ ਲਾਈਨ]”` | `home.voices.quote` |

## Ambiguous or not reproducible

1. The "Voices of the sangat" video tile is a static navy box with a play glyph and a caption; the reference has no video URL, no link and no click handler. Ported as the same static markup. A YouTube id or link is needed before it can play.
2. The "As featured in" tiles are plain text names (The Tribune, PTC Punjabi, ABP Sanjha, Ajit). The CSS has rules for `.press-t img` logos, but the reference ships no logo images, so none were added.
3. The hero `.hero-opts` wrapper keeps `data-opt="c"` and the single `.hopt.hopt-c` child. Options a and b, and the `.hopt-switch` buttons, do not exist in the reference markup and were not created.
4. `data-en-alt`, `data-pa-alt`, `data-en-aria-label` and `data-pa-aria-label` runtime-switching attributes are not emitted; each page renders one language and the Punjabi values live in `home.pa.json` / the structured JSON.
5. No image is in the first viewport of Home at 1440×900 or 390×844 (the hero is an inline SVG), so every `<Photo>` on this page keeps `loading="lazy"` as in the reference.
6. The route-map SVG `<text>` labels: the reference carries both `<text class="l-en">` and `<text class="l-pa">` with different `font-size` and `y`; production renders only the current language's `<text>` with its own attributes.
7. Structured content lives outside the i18n parts: `src/content/impact-stats.json` (numbers block), `src/content/home-doors.json` (four door cards), `src/content/press.json` (press tiles). Their en/pa strings are therefore not duplicated in `home.en.json` / `home.pa.json`.
8. "Figures as of October 2026" (`home.stats.note`) is a dated claim; it will need an owner to refresh.

## Verification harness note

`node tests/visual/compare.mjs home` (all four pairs in one run) fails the two PA pairs for a reason outside this page: the harness shoots EN and PA on the same browser context and origin, `src/scripts/lang.ts` stores `dgrls-lang=en` after the EN visits, and the direct visit to `/pa/` (no referrer) is then redirected to `/`. Running the PA pairs on their own (`node tests/visual/compare.mjs home pa`) passes. See the final report for the proposed one-line harness fix.
