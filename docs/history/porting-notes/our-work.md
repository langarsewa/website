# Our Work — open items

Status as of Oct 17, 2026. Routes `/our-work/` and `/pa/our-work/`; component
`src/components/pages/OurWorkPage.astro`.

## Verified

| Check                                                | Result                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm build`                                         | both routes generated                                                                     |
| `node tests/content/parity.mjs our-work`             | EN 192/192, PA 177/177 strings present                                                    |
| `node tests/visual/compare.mjs our-work`             | 4/4 pairs: 0.18% / 0.68% / 0.18% / 0.68% pixels, 0.00% height (see note 1)                |
| `npx playwright test tests/e2e/our-work-map.spec.ts` | 8/8 (chips, search EN + PA, pin click, row click, Enter/Space, PA labels, collapsed list) |
| `astro check`                                        | 0 errors in Our Work files                                                                |

The remaining pixel difference is re-encoding noise inside the photos (AVIF from `<Photo>`
against the reference WebP); text and layout are identical.

## Open items

1. **Visual harness and the remembered language.** `src/scripts/lang.ts` rule 2 opens the
   remembered language on a direct visit with no same-origin referrer. `tests/visual/compare.mjs`
   reuses one browser context, so after the EN run stores `dgrls-lang=en`, the PA run of any page
   is redirected to the EN page and fails at ~12–20%. The numbers above were produced with one
   added line in `shootOnce`, before `setViewportSize`:
   `await page.addInitScript(() => { try { localStorage.removeItem('dgrls-lang'); } catch {} });`
   The same line (or a fresh context per shot) belongs in `tests/visual/compare.mjs`; not applied
   here because tests/* is shared.
2. **Stale count in the reference markup.** The reference ships `#loccount` as "32 locations"
   (PA: "ਸਥਾਨ") and its script overwrites it with the real total (38) on load. The port keeps the
   reference string server-side (`ourWork.locations.countInitial`) so content parity holds, and
   `map.ts` sets the real count on load exactly as before. If the owner prefers, the static
   string can be changed to "38 locations" / "38 ਸਥਾਨ" once the parity rule allows it.
3. **Heading figure vs data.** The section title says "31 hospitals, 2 kitchens" while
   `locations.json` has 31 hospitals, 2 kitchens and 5 school/community sites (38 total).
   Consistent with the reference; flagged only so the copy owner knows the two figures differ.
4. **Punjabi count label.** The reference uses the same word for one and many (" ਸਥਾਨ"); kept as is.
5. **Playwright config.** `tests/e2e/our-work-map.spec.ts` serves `dist/` itself in `beforeAll`
   and does not rely on `baseURL`, so it runs with or without the project config; it needs
   `pnpm build` first.

## Data provenance

- `src/content/locations.json`: 38 entries extracted by script from the reference `#locdata`
  block (names, regions, type) joined to the 38 `.pin` elements by `data-i` (x, y from
  `transform="translate(x y)"`). Every index 0–37 matched on name, region and type; list rows
  were cross-checked the same way.
- `src/content/programs.json`: the 8 program cards extracted by script from the reference
  markup (title, text, image file, alt, and the ambulance `tel:` link on card 3).
- `src/components/our-work/punjab-outline.html`: the two outline polygons and the three region
  labels copied byte for byte from the reference SVG.
