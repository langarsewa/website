# Sewa Control Room: web app

Status: phase 1, Oct 17, 2026. Audience: whoever changes a screen. The API contract lives in
[architecture.md](./architecture.md); the API itself is in `functions/api/`.

## What it is

Astro 7, static output, no UI framework. Each screen is one `.astro` page that renders its
skeleton at build time and a `<script>` block that fetches from `/api/*`, derives state through
`src/lib/derive.ts`, and paints the DOM with `src/lib/dom.ts`. Phone first at 390px; at 900px
and wider the navy header and bottom bar give way to a sidebar.

## Page map

| Route          | File                               | Reads                                    | Writes              | Notes                                                                                                                                       |
| -------------- | ---------------------------------- | ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | `src/pages/index.astro`            | `/api/status`, `/api/pending`, `/api/me` | none                | Shows the red "Needs attention" card when `check.ok` is false or `ci.main.conclusion` is `failure`                                          |
| `/review/`     | `src/pages/review/index.astro`     | `/api/me`, `/api/status`, `/api/pending` | `POST /api/publish` | Publish button is enabled only for role `owner` with at least one pending change; 409 sends you to `/publishing/`                           |
| `/publishing/` | `src/pages/publishing/index.astro` | `/api/publish/current` every 5 s         | none                | Stops polling on `merged`, `failed` or `idle`                                                                                               |
| `/history/`    | `src/pages/history/index.astro`    | `/api/me`, `/api/history`                | `POST /api/restore` | In-page confirmation card; restore buttons hidden for role `editor`                                                                         |
| `/change/`     | `src/pages/change/index.astro`     | `/api/me`                                | none (phase 1)      | Page picker, three doors; Words and Picture show "Coming in the next update"; Something else opens a prefilled `mailto:info@langarsewa.org` |

Shared pieces:

| Piece        | File                                   | Role                                                                                                                |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Layout       | `src/layouts/App.astro`                | Header (home or sub variant), bottom bar, sidebar, manifest and icon links, `theme-color`, error banner, 403 screen |
| Styles       | `src/styles/global.css`                | Tokens from the artboards (`--navy`, `--basant`, `--ok`...), cards, buttons, steps, skeletons, laptop layout        |
| API          | `src/lib/api.ts`                       | Typed fetch wrapper, shape guards, `ApiError`, mock switch                                                          |
| Types        | `src/lib/types.ts`                     | The API shapes; change here first when the contract changes                                                         |
| Derivation   | `src/lib/derive.ts`                    | `needsAttention`, `attention`, `summarizeCi`, `publishView`, labels                                                 |
| Shell        | `src/lib/shell.ts`                     | `boot(load)`: runs a page loader with the banner-and-retry and 403 handling; `whoAmI()` fills the avatar            |
| Time, people | `src/lib/time.ts`, `src/lib/people.ts` | "Fri 17 Oct, 9:30 AM", "10 min ago", first names and initials                                                       |
| Fixtures     | `src/lib/fixtures.ts`                  | Mock data, relative to now, with scenes                                                                             |

## Mock mode

The app runs without the API so screens can be built and screenshot-tested.

- Build-time: `PUBLIC_MOCK=1 pnpm dev` (or `pnpm build`).
- Run-time: open any page with `?mock=1`. The flag sticks for the browser session so the bottom
  bar keeps working; `?mock=0` turns it off.
- Scenes: add `&scene=<name>` once; it sticks too.

| Scene               | What you see                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `healthy` (default) | Green live site, 2 changes waiting, 3 versions in History                                 |
| `problem`           | Home shows "The last publish did not go through"; a mock publish fails at the first check |
| `down`              | Home shows "langarsewa.org is not answering" with Restore first                           |
| `editor`            | Signed in as an editor: no publish, no restore buttons                                    |
| `empty`             | Nothing waiting to publish                                                                |
| `forbidden`         | Every call answers 403: the "not on the list" screen with the email                       |
| `offline`           | Every call fails: the banner with Try again                                               |

A mock publish advances with the clock after you press Publish: waiting for 20 s, ready for
10 s, then merged. The Publishing page can therefore be watched end to end.

## How to add a screen

1. Add the route under `src/pages/<name>/index.astro` (trailing-slash directories are the
   convention; the config sets `trailingSlash: 'always'`).
2. Wrap it in `App.astro`: `title`, `active` (which bottom-bar item is current), `back` (sub
   pages), `narrow` (default true; Home uses the full grid). Put a sticky action bar in
   `slot="footer"` when the screen has one primary action.
3. Render the resting state with loading skeletons (`<Skeleton />`) and real buttons and links,
   each with an `id` the script can find. Keep everything that reads as text in the markup so
   the page is legible before JavaScript runs.
4. Add any new API shape to `src/lib/types.ts`, a guard and a method to `api` in `api.ts`, and
   a fixture to `fixtures.ts`. The guard is what protects the page from a half-shaped answer.
5. Put the logic in `derive.ts` (pure, tested) and keep the page script to fetch-derive-paint.
   Wrap the loader in `boot()` so the banner, retry and 403 screen come for free.
6. Add a vitest in `tests/ui/` for the derivation and run the gate: `pnpm test`, `pnpm build`,
   `pnpm exec astro check`, `pnpm exec eslint src`, `pnpm exec prettier --check src public`.

## Conventions

- Colours, type and spacing come from the approved artboards and live as tokens in
  `global.css`. Text never uses a grey lighter than `--muted` (#4A5568) on white.
- Real `<button>` and `<a>` elements, labelled inputs, visible focus (`:focus-visible` in basant),
  touch targets at least 44px (`--tap`).
- No `innerHTML` with data; use `h()` and `replaceChildren()` from `dom.ts`.
- Append and insert through `append()` / `after()` from `dom.ts`, not `el.append()` directly.
  The root tsconfig loads `@cloudflare/workers-types` for the API, and its HTMLRewriter
  `Element` hides the DOM `ParentNode.append` / `ChildNode.after` signatures under `astro check`.
- No `window.confirm`; confirmations are in-page cards (see History).
- Icons are inline SVG. No emoji.
- Punjabi text gets `lang="pa"` so it picks up Noto Sans Gurmukhi.

## PWA

`public/manifest.webmanifest` (name "Sewa Control Room", short name "Control Room",
standalone, navy theme, parchment background) and icons under `public/icons/`: 192 and 512 PNG,
a 512 maskable PNG, a 180 apple-touch-icon and an SVG. The PNGs were rasterised once from the
same SVG mark (Ik Onkar in basant on navy) with sharp, which Astro already brings in; there is no
build step for them.
