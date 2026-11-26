# Contact page: open items

Routes `/contact/` and `/pa/contact/`. Component `src/components/pages/ContactPage.astro`; strings in
`src/content/i18n/parts/contact.{en,pa}.json`. Reference: `reference/index.html` lines 392–410.

## Content placeholders

None. The page has no bracketed `[…]` placeholders. One item is pending content rather than a placeholder:

| Item                  | Where                                                                         | Status                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp & USA number | `.crow` "WhatsApp & USA" → "Coming soon / A dedicated number is being set up" | Copied as in the reference; replace with the number when the organisation has it (string keys `contact.reach.whatsapp.value` / `.note`). |

## Deliberate deviations from the reference markup

| Deviation                                                                 | Why                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<option value="<English label>">` with localised text                    | The reference used `data-en` / `data-pa` on each `<option>` and swapped the text at runtime, so a Punjabi visitor's mailto subject carried the Punjabi label. Production renders one language per page; the value stays English so the subject is always `Website enquiry: <topic>` as the coordinator specified. |
| Locator map renders one `<text>` per label (`.l-en` or `.l-pa`), not both | One language per page; the hidden sibling would only add untranslated text to the DOM. Font family follows the language exactly as the reference's two variants did.                                                                                                                                              |
| `data-en-aria-label` / `data-pa-aria-label` on `svg.cmap` dropped         | The runtime language switch they fed no longer exists; `aria-label` is rendered in the page language from `contact.visit.mapLabel`.                                                                                                                                                                               |
| `data-directions=""` on the "Get directions" link                         | Hook for `src/scripts/contact-form.ts` (`directions_click` analytics event).                                                                                                                                                                                                                                      |
| Google Maps URL is a constant in the component                            | Not in `site.json` (shared file, not edited for this port). Candidate to move to `site.json` later together with the address.                                                                                                                                                                                     |
| No NextBand                                                               | The reference has no "Next" band after Contact; matched.                                                                                                                                                                                                                                                          |

## Shared behaviour that affects this page (not changed here)

1. `src/scripts/lang.ts` rule 2 redirects a _direct_ visit to the remembered language. After any English page
   visit, opening `/pa/contact/` without a same-origin referrer lands on `/contact/`. This is a site-wide
   rule, but it also makes `tests/visual/compare.mjs` screenshot the English page for every `*-pa-*` pair when
   all four pairs run in one process (one browser context). Measured per language in separate processes
   until the harness creates a context per shot (diff proposed in the port report).
2. Headless Chromium creates the `mailto:` window target but never commits a navigation, so Playwright emits
   no `popup` event. `tests/e2e/contact-form.spec.ts` therefore records the real `window.open` call via an
   init script and asserts on the `mailto:` URL (subject, body), and only additionally checks the popup URL if
   the browser surfaces one.

## Verification record

First verified from an isolated build (Home, 404 and the two Contact routes only) while other pages' route
files were still in flight; then re-verified against a full root `pnpm build` (15 pages) once they landed.
Parity 86 EN / 74 PA strings present; visual 0.00% pixels and 0.00% height on all four pairs (EN and PA measured
in separate processes, see item 1 above); `tests/e2e/contact-form.spec.ts` 6/6 passing.
