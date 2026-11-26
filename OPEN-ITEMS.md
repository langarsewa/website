# Open items

Everything below needs content, a decision or a review from the sewa. Nothing here was
invented to fill a gap: placeholders stay as they were in the approved design, and new strings
are marked. File paths point at where the change goes.

## Content the sewa still needs to supply

| #   | Item                                                                                                                                                  | Where it goes                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Per-video titles for the ten "Watch the sewa" videos (alt text is the generic "Video from the sewa" for all ten)                                      | `src/content/videos.json`                                                 |
| 2   | Press logos for The Tribune, PTC Punjabi, ABP Sanjha and Ajit. The design has the tile styling for logos but ships none; tiles show the names as text | press entries + files in `src/assets/images/`                             |
| 3   | The year for the Punjab Floods crisis card (COVID-19 shows "2020"; Floods has none)                                                                   | `src/content/crisis.json`                                                 |
| 4   | Whether a "more stories coming soon" line is wanted under the crisis cards (`.cr-soon` exists in the CSS, nothing uses it)                            | `src/components/pages/ImpactPage.astro`                                   |
| 5   | Owner and refresh cadence for the dated figures ("Figures as of November 2026" on Home and Impact)                                                    | `home.stats.note`, `impact.metrics.note`, `src/content/impact-stats.json` |
| 6   | Newsletter section: waiting on materials                                                                                                              | new section, page to be decided                                           |

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

## Domain and email (live since Nov 26, 2026)

Setup and records: `docs/deploy-cloudflare.md`. Undo: `docs/rollback.md`.

- **Done:** www.langarsewa.org serves the site from Cloudflare Pages; bare langarsewa.org
  redirects to www through Squarespace; email untouched; SPF now includes Google
  (`include:_spf.google.com`).
- **Before cancelling the Squarespace website plan:** the bare-domain redirect depends on it.
  Set up a forward or move the nameservers first.
- **DKIM for Google Workspace:** not set up. Generate a key in admin.google.com → Apps → Google
  Workspace → Gmail → Authenticate email, add it at Squarespace as TXT `google._domainkey`, then
  click Start authentication.
- **Optional clean-up at Squarespace:** the legacy `MX 0 langarsewa.org.`, `webmail` A and `mail`
  CNAME rows. Remove only after confirming nobody uses webmail.langarsewa.org.
- **HSTS:** still off; can be enabled for www (`public/_headers`).

## Hosting and analytics

- Production is Cloudflare Pages, deployed from CI after every gate. If GitHub Pages is still
  enabled in the repository settings, disable it; the `CNAME` file for it has been removed.
- **Analytics:** Cloudflare Web Analytics switched on in the dashboard on Nov 26, 2026. It starts
  counting from the first production deploy that carries the updated CSP.
- **Repository hygiene:** merged branches were deleted on Nov 26, 2026. Kept on purpose:
  `docs/events-page-spec` (parked spec), `monorepo/add-control-room` (6 unmerged commits) and the
  Dependabot `@types/node` 26 bump, which should be closed: the site runs on Node 24. Protect
  `main` (README → Releasing a change).

## Site feedback, Nov 24, 2026

- COVID milestone: the note read "food trucks all over Punjab at request of …". Who asked is
  missing, so the clause is left out until confirmed.
- Chandigarh (Sector 32) Langar hall: the Governor's-request video has no link yet. The pin is
  named "Langar Hall, Sector 32, Chandigarh"; confirm the hospital name (likely GMCH-32).
- Kartarpur kitchen: the photo of the 7-acre plot is still to come (placeholders on Our Story
  and Future Vision). Confirm the place name, since the note said "Kartarpur, Amritsar".
  Confirm whether this is the same land as the charitable hospital.
- Giani Pinderpal Singh Ji: resolved. No quoted line; the section reads "Message from Giani
  Pinderpal Singh Ji". The clip link opens at 3:04:21; a watch link cannot stop at 3:05:45.
- Home stat "250 students fed at Ajjowal" still names the school and count; the school program
  text no longer does.
- New Punjabi strings from this round need native-speaker review.

## Site feedback, Nov 25, 2026

- Meals updated to 115,000 a day (85,000 Pur Heeran, Hoshiarpur; 30,000 Madhir). "Figures as
  of" now reads November 2026.
- New Punjabi strings for native-speaker review: `footer.india` ("ਭਾਰਤ:"),
  `footer.whatsapp` ("ਅੰਤਰਰਾਸ਼ਟਰੀ ਵਟਸਐਪ:"), and the Impact crisis heading, which now reuses
  the former kicker "ਸੰਕਟ ਵਿੱਚ ਸੇਵਾ".
- The Feb 2019 milestone has no video link. The journey still supports a `video` field if one
  is added later.
- Newsletter section: waiting on materials.

## Site feedback, Nov 25, 2026 (second round)

- Logo removed from the header and footer. The browser-tab icon (`public/favicon.svg`) still uses it.
- Impact Voices now has three tiles. Bhai Sahib Bhai Pinderpal Singh Ji (also on Home) and
  Varinder Kumar Sharma play self-hosted 720p cuts from `public/videos/` (about 21 MB each; Pages
  caps a file at 25 MB). The Gulab Chand Kataria
  tile plays the YouTube video `J7UEEXBLz_k` inline (it runs 6 min 57 s, too long to self-host).
- The Pinderpal Singh Ji caption still reads "Annual Samagam 2025". Confirm that the new cut is
  from that Samagam.
- Instagram is now `instagram.com/dhangururamdaslangarsewa` everywhere. Future Vision's button reads
  "Follow on Instagram"; its body text still mentions YouTube, Instagram and Facebook.
- New Punjabi for native-speaker review: `impact.voices.main.name`, `dc.role`, `dc.role2`,
  `governor.*`, `futureVision.follow.instagram`.
- Mission now reads "...adequate nutrition, healthcare, and education in Punjab" (Home hero and
  Our Story). The Punjabi line ("ਪੌਸ਼ਟਿਕ ਭੋਜਨ, ਸਿਹਤ ਸੰਭਾਲ ਅਤੇ ਸਿੱਖਿਆ ਤੋਂ ਵਾਂਝਾ ਨਾ ਰਹੇ") needs
  native-speaker review.
