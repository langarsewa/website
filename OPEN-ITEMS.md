# Open items

Everything below needs content, a decision or a review from the sewa. Nothing here was
invented to fill a gap: placeholders stay as they were in the approved design, and new strings
are marked. File paths point at where the change goes.

## Placeholders carried over from the approved design

| Where                         | Text                                                                             | File and key                                                |
| ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Home, "Voices of the sangat"  | `“[Selected line from Giani Pinderpal Singh Ji’s message]”` and the Punjabi twin | `src/content/i18n/en.json`, `pa.json` → `home.voices.quote` |
| Impact, Voices (first figure) | Same placeholder quote                                                           | `impact.voices.main.quote`                                  |

## Content the sewa still needs to supply

| #   | Item                                                                                                                                                               | Where it goes                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | The chosen line from Giani Pinderpal Singh Ji's message, in both languages                                                                                         | the two keys above                                                                               |
| 2   | YouTube links for the two "Voices" video tiles (Giani Pinderpal Singh Ji's message; D.C. Varinder Kumar Sharma). They are static panels in the design, with no URL | Home and Impact voices sections; once supplied they become outbound links like the gallery cards |
| 3   | Per-video titles for the ten "Watch the sewa" videos (alt text is the generic "Video from the sewa" for all ten)                                                   | `src/content/videos.json`                                                                        |
| 4   | Press logos for The Tribune, PTC Punjabi, ABP Sanjha and Ajit. The design has the tile styling for logos but ships none; tiles show the names as text              | `src/content/press.json` + files in `src/assets/images/`                                         |
| 5   | WhatsApp and USA number (Contact shows "Coming soon / A dedicated number is being set up")                                                                         | `contact.reach.whatsapp.value`, `.note`; footer "WhatsApp: coming soon" in `footer.whatsapp`     |
| 6   | The year for the Punjab Floods crisis card (COVID-19 shows "2020"; Floods has none)                                                                                | `src/content/crisis.json`                                                                        |
| 7   | Whether a "more stories coming soon" line is wanted under the crisis cards (`.cr-soon` exists in the CSS, nothing uses it in the design)                           | `src/components/pages/ImpactPage.astro`                                                          |
| 8   | Owner and refresh cadence for the dated figures ("Figures as of October 2026" on Home and Impact)                                                                  | `home.stats.note`, `impact.metrics.note`, `src/content/impact-stats.json`                        |

## Punjabi native-speaker review

New strings exist only where the design had none. None were machine-translated.

| String                                              | Status                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `joinTheSewa.donateOnline` ("Donate online")        | Punjabi value is still the English text. Needs a translation before the donation button is switched on            |
| `*.meta.description` for every page, both languages | Assembled from phrases already on each page (the design had no per-page descriptions). Review the Punjabi wording |
| `notFound.*` (404 page)                             | New in both languages; review the Punjabi                                                                         |

## Accessibility decision needed

- **"Explore →" on the four Home cards** is gold (`#B08A00`) on white at 16px, a contrast ratio
  of 3.24:1 against the 4.5:1 WCAG AA threshold. It is the approved design, so it was kept, and
  the accessibility gate carries one documented exception for exactly these four links
  (`tests/a11y/axe.spec.ts`). Two ways to close it: darken that one colour to `#8A6D00` or
  deeper (4.6:1, a visible but small change), or accept the exception. Every other route passes
  axe with zero serious or critical issues in both languages.

## Copy that is consistent with the design but worth a look

- **Our Work heading says "31 hospitals, 2 kitchens"** while the map data has 38 sites: 31 hospitals,
  2 kitchens and 5 school/community sites. Same as the design; flagged so the copy owner knows.
- **The design ships the location count as "32 locations"** and its script corrects it to 38 on
  load. Production does the same for parity; the static string is `ourWork.locations.countInitial`
  and can be changed to 38 once the sewa confirms.
- **Punjabi count label** uses one word for singular and plural (" ਸਥਾਨ"), as in the design.
- **International "Donate online" placement.** The design has no international card, so when a
  URL is set the button sits beside the "Email info@langarsewa.org" button in Step 3. Confirm or move.

## Deliberate differences from the design (not visible)

- One language per page. The design toggled `.l-en` / `.l-pa` spans with CSS; production renders
  the page language only, with the same span classes so the stylesheet applies unchanged. The
  runtime language-switch attributes (`data-en-alt`, `data-pa-aria-label`, `data-en` on options)
  are therefore not emitted; their values live in the JSON content.
- Contact form topic values stay English in both languages so the mailto subject is always
  "Website enquiry: <topic>". The design would have sent the Punjabi label on the Punjabi page.
- Kitchen galleries render the first photo server-side (the design filled it with JavaScript), so
  the page is complete without scripts and the lightbox shows full-size photos.
- Section ids drop the page prefix (`#locations`, not `#our-work-locations`). Old hash links
  (`/#/our-work/locations`) redirect to the new form.
- The language memory applies to direct visits to `/` or `/pa/` only. A shared deep link opens
  in the language it was shared in.
- Inline `style` attributes from the design are kept as they are; moving them into classes is a
  later clean-up. The CSP therefore allows inline styles (`style-src 'self' 'unsafe-inline'`)
  while scripts remain `'self'` only.

## Performance note

Lighthouse on the live Cloudflare deployment (`langarsewa.pages.dev`, mobile profile, median of 3):
performance 98, accessibility 96, best practices 100, SEO 100 on Home, Punjabi Home and Our Work;
Home FCP 1.0s and LCP 2.30s, inside the 2.5s target. The local simulation measured LCP at 2.70s
because it serves fonts without a CDN; the brief's LCP target is met where it matters, on the host.
CI keeps LCP as a warning and the category scores as hard gates.

## Email and domain (from `docs/dns-before.md`)

- `info@langarsewa.org` is Google Workspace. The SPF record authorises only Squarespace mail
  (`include:squarespace-mail.com`), not Google; DMARC is `p=none`; no DKIM record was found at
  the common selectors. These predate the project. The migration copies the records unchanged;
  fixing SPF/DKIM is a separate decision for the sewa.
- A screenshot of Squarespace → Domains → langarsewa.org → DNS is still needed before the
  nameserver switch, to catch any record `dig` cannot enumerate.

## Hosting

Production is Cloudflare Pages, deployed from CI after every gate. GitHub Pages was used for a
day as a stop-gap and has been removed from the workflow; disable it in the repository settings
if it is still enabled there. `public/_headers` and `public/_redirects` are the live
configuration.

## Analytics

Off by default. Turning it on needs the Cloudflare Web Analytics token in `site.json` and
`https://static.cloudflareinsights.com` added to `script-src` and `connect-src` in
`public/_headers`.
