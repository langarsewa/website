# Sewa Control Room: architecture

Status: draft for build, Oct 17, 2026. Audience: whoever builds or maintains it.

## Decision stance

A thin console over systems that already exist. It never holds content of its own: the website
repository is the source of truth, GitHub Actions is the only path to production, Cloudflare
serves what CI deploys. The console lets a sewadar do five things from a phone without seeing
GitHub, Cloudflare or Squarespace: see status, make a change, publish, restore, request help.

| Concern | Choice | Why |
|---|---|---|
| Hosting | Cloudflare Pages project `control`, custom domain `control.langarsewa.org` | Same host as the site, free, HTTPS by default |
| Web app | Astro (static pages) + small TypeScript islands; installable (web manifest) | One codebase, phone first, no app store |
| API | Cloudflare Pages Functions (Hono) in the same project under `functions/api/*` | One deploy, secrets stay server-side |
| Identity | Cloudflare Access in front of the whole hostname; Google sign-in, one-time email code fallback; allow-list of emails | No auth code of our own; free to 50 users |
| GitHub access | A GitHub App ("Sewa Control Room") installed on `langarsewa/website`; installation tokens minted per request | Scoped, revocable, commits can carry the acting person's name |
| Cloudflare access | API token with Cloudflare Pages: Edit only | Deployments list and rollback |
| Data | None of our own in v1. Optional KV later for request status cache | Git and Cloudflare already hold the state |
| Agent path (phase 3) | GitHub Action in the website repo triggered by a labelled issue; opens a pull request | Same gates as humans; cannot publish |

## Roles

The Worker reads the signed Access identity (`Cf-Access-Jwt-Assertion`) on every request, verifies
it against the team's public keys, and maps the email to a role from `config/people.json`
(committed, small, reviewed like code):

| Role | Can |
|---|---|
| owner | everything below plus publish, restore, edit `people.json` |
| editor | see status, make changes (words, pictures), request changes |

Unknown email: Access already blocked it; the Worker still answers 403.

## API (all under `/api`, JSON, same-origin only)

| Method and path | What it does | Backed by |
|---|---|---|
| GET `/api/me` | identity and role | Access JWT + people.json |
| GET `/api/status` | live deployment, test-site deployment, latest CI runs, last production check | Cloudflare deployments; GitHub Actions runs |
| GET `/api/pending` | commits on `dev` not on `main`, summarised per change | GitHub compare API |
| POST `/api/publish` | open or reuse the `dev`→`main` pull request, wait for checks, merge | GitHub pulls API; requires owner |
| GET `/api/history` | production deployments with who/when/what | Cloudflare deployments + Git log |
| POST `/api/restore` | Cloudflare rollback to a deployment id, then a revert commit on `main` | Cloudflare Pages API; GitHub; owner |
| GET `/api/content/:page` | editable fields for a page, EN and PA | reads `src/content/*.json` from `dev` |
| PUT `/api/content/:page` | writes the changed fields as one commit on `dev`, author = acting person | GitHub contents API |
| POST `/api/photos` | upload: resize server-side, commit file + caption | GitHub contents API |
| POST `/api/requests` | create a labelled issue for the agent path | GitHub issues API |
| GET `/api/requests` | open requests with their pull request and preview URL | GitHub issues + pulls |

Every write is logged (actor, action, target, result) to the Worker's console logs and, when
KV is added, to an `audit` namespace.

## Screens (from the prototype)

Home, Change (page → kind → details → saved), Review and publish, Publishing, History and
restore, When something breaks, laptop layout of Home. Bottom bar: Home, Change, History.

## Secrets

Set as encrypted Pages secrets, never in the repo: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_APP_INSTALLATION_ID`, `CLOUDFLARE_PAGES_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.

## Phases

1. Sign-in, Home status, Review and publish, History with restore.
2. Change: words and pictures.
3. Something else: the agent path.

## Not in scope

Analytics dashboards, user-generated content, anything that writes to production directly.
