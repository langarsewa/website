# Sewa Control Room: API

Status: phase 1 built, Oct 17, 2026. Audience: whoever builds the web UI against it or operates it.

The API is a set of Cloudflare Pages Functions (Hono) under `functions/api/`, deployed with the
Astro site as one Pages project. It holds no state: GitHub and Cloudflare Pages are read and written
on every call. The Hono app lives in `functions/_lib/app.ts`; `functions/api/[[path]].ts` only
adapts it to Pages. Response types the UI can import are in `functions/_lib/types.ts`.

## Endpoints

All responses are JSON with `Cache-Control: no-store`. Every endpoint requires a signed-in caller
(see Auth). Errors are always `{ "error": { "code", "message" } }`.

| Method and path                      | Role  | Returns                                                                       | Backed by                                                                                |
| ------------------------------------ | ----- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET `/api/me`                        | any   | `{email, role: 'owner' \| 'editor'}`                                          | Access JWT + `config/people.json`                                                        |
| GET `/api/status`                    | any   | `{production, test, ci: {main, dev}, check}`                                  | Cloudflare deployments and project; GitHub Actions runs; GitHub commits (author names)   |
| GET `/api/pending`                   | any   | `{count, compareUrl, changes: [{sha, title, author, at, files}]}`             | GitHub compare `main...dev`, one commit lookup per change for `files`                    |
| POST `/api/publish`                  | owner | `{pr: {number, url}, state, checks: [{name, status, conclusion}]}`            | GitHub pulls and check-runs; merges when every check passed                              |
| GET `/api/publish/current`           | any   | same as above, or `{pr: null, state: 'idle'}`                                 | GitHub pulls and check-runs; never merges                                                |
| GET `/api/history`                   | any   | `{deployments: [{id, url, at, commit, message, by, environment, isCurrent}]}` | Cloudflare production deployments (max 20, newest first); GitHub `main` commits for `by` |
| POST `/api/restore` `{deploymentId}` | owner | `{ok: true, deploymentId}`                                                    | Cloudflare Pages rollback                                                                |
| anything else under `/api`           | any   | 404 `not_found`                                                               |                                                                                          |

### Shapes worth knowing

`production` and `test` in `/api/status` share one shape:
`{url, deploymentId, commit, message, at, by}`. `url` is always the public URL from
`SITE_PRODUCTION_URL` / `SITE_TEST_URL`; the other fields are `null` when no matching deployment
exists. `message` is the first line of the commit message. `by` is the Git author name, `null` if
GitHub cannot be reached.

- `production` is the deployment Cloudflare reports as the project's `canonical_deployment`
  (what is live, which after a restore is not the newest build). If the project lookup fails it
  falls back to the newest successful production deployment.
- `test` is the newest successful preview deployment whose branch is `dev`.
- `ci.main` / `ci.dev` come from the latest GitHub Actions run named `CI` on that branch:
  `{status, conclusion, url, at}`, all `null` if none.
- `check` comes from the latest **completed** run of the workflow named `Production check`:
  `{ok: conclusion === 'success', at, url}`. A run still in progress does not replace the last verdict.

`/api/pending` lists commits on `dev` that are not on `main`, newest first, merge commits
removed. `count` equals `changes.length`. `files` are fetched per commit for the newest 25 changes;
older ones get `[]`.

### Publish state machine

`POST /api/publish` is idempotent; the UI can poll it (or `GET /api/publish/current`) until it
leaves `waiting`.

| State     | Meaning                                                                                                                    | What POST does                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `waiting` | PR exists (found or just opened); no check runs yet, or at least one still running                                         | Nothing further                                                        |
| `failed`  | At least one check run completed with `failure`, `cancelled`, `timed_out`, `action_required`, `startup_failure` or `stale` | Does not merge                                                         |
| `ready`   | Every check run completed with `success`, `neutral` or `skipped`                                                           | POST merges immediately and returns `merged`; only GET returns `ready` |
| `merged`  | POST merged the PR with a merge commit titled `Publish to langarsewa.org (#n)`                                             |                                                                        |
| `idle`    | GET only: no open `dev -> main` PR                                                                                         |                                                                        |

The PR title is always `Publish to langarsewa.org`, head `dev`, base `main`. If GitHub reports
that `dev` has nothing `main` lacks (HTTP 422 on create), POST answers 409 `nothing_to_publish`.
If GitHub refuses the merge (conflict, branch protection), POST answers 502 `upstream_error` with
GitHub's message.

### Restore

`POST /api/restore {deploymentId}` validates the id, confirms it is a successful production
deployment, compares it with the live (canonical) deployment, then calls the Cloudflare rollback
endpoint. It answers 409 `already_current` when the id is already live, 409 `not_production` /
`not_restorable` for anything that cannot be rolled back to, 404 when Cloudflare does not know the id.

**TODO (phase 1 gap):** the matching revert commit on `main` is not created yet
(`createCommitRevert` in `functions/_lib/github.ts` is intentionally absent). After a restore,
`main` still holds the bad commit, so the next publish re-deploys it. Until the revert lands the
UI should say so after a restore, and the Home screen will show the live deployment correctly
because it reads the canonical deployment rather than the newest build.

### Error codes

| HTTP | code                                                                        | When                                                                                            |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 400  | `bad_request`                                                               | Malformed JSON body or missing `deploymentId`                                                   |
| 401  | `unauthorized`                                                              | No Access token, invalid signature, wrong audience or issuer, no email claim, or bypass refused |
| 403  | `not_allowed`                                                               | Email not in `config/people.json`, or an editor calling an owner-only endpoint                  |
| 404  | `not_found`                                                                 | Unknown route, or GitHub / Cloudflare answered 404 for the resource                             |
| 409  | `already_current`, `not_production`, `not_restorable`, `nothing_to_publish` | State conflicts described above                                                                 |
| 502  | `upstream_error`                                                            | GitHub or Cloudflare failed; message carries the upstream text                                  |
| 500  | `internal`                                                                  | Unexpected exception (logged with stack)                                                        |

## Auth flow

1. Cloudflare Access sits in front of `control.langarsewa.org`. After sign-in it adds the header
   `Cf-Access-Jwt-Assertion` to every request (and sets the `CF_Authorization` cookie, which the API
   accepts as a fallback).
2. `functions/_lib/auth.ts` verifies the JWT with jose against
   `https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, issuer `https://${ACCESS_TEAM_DOMAIN}`,
   audience `ACCESS_AUD` (the Access application's AUD tag). The JWKS is cached per isolate.
3. The `email` claim is matched case-insensitively against `config/people.json`: `owners` first,
   then `editors`. No match: 403 `not_allowed`, even though Access let the request through.
4. `{email, role}` is attached to the request context; owner-only routes add `requireOwner`.

Local bypass: when `DEV_BYPASS_EMAIL` is set **and** `ACCESS_TEAM_DOMAIN` is empty, a request with no
JWT is treated as that email. If `ACCESS_TEAM_DOMAIN` is set the bypass is ignored and the request
gets 401, so a leaked `DEV_BYPASS_EMAIL` cannot open production.

Every write (`publish.open_pr`, `publish.merge`, `restore.rollback`) is logged to the Functions log
as one JSON line: `{"kind":"audit","at","actor","action","target","result"}`.

## Creating the GitHub App

1. GitHub: organisation `langarsewa` → Settings → Developer settings → GitHub Apps → New GitHub App.
   Name `Sewa Control Room`, homepage `https://control.langarsewa.org`, no callback URL, webhooks off.
2. Repository permissions: **Contents: Read and write**, **Pull requests: Read and write**,
   **Actions: Read-only**, **Checks: Read-only**, **Metadata: Read-only**. No organisation or
   account permissions. "Only on this account".
3. Create the app, note the **App ID** (`GITHUB_APP_ID`).
4. Generate a private key; GitHub downloads a PKCS#1 `.pem`. The Workers runtime needs PKCS#8:

   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem -out key-pkcs8.pem
   ```

   The converted file starts with `-----BEGIN PRIVATE KEY-----`. Its full contents, newlines
   included, are the `GITHUB_APP_PRIVATE_KEY` secret. Delete both files once the secret is set.

5. Install the app on the organisation, selecting **only** `langarsewa/website`. The installation
   id is the number at the end of the resulting URL
   (`https://github.com/organizations/langarsewa/settings/installations/<id>`): `GITHUB_APP_INSTALLATION_ID`.

Installation tokens are minted per isolate and cached until 5 minutes before expiry
(`functions/_lib/github.ts`). Merge commits are authored by the app (`sewa-control-room[bot]`).

## Cloudflare

- `CLOUDFLARE_PAGES_TOKEN`: My Profile → API Tokens → Create Token → Custom. Permission
  **Account → Cloudflare Pages → Edit**, scoped to the langarsewa account only. Nothing else.
- `CLOUDFLARE_ACCOUNT_ID`: the account id shown on any zone overview (pre-filled in `.dev.vars.example`).
- `ACCESS_TEAM_DOMAIN`: Zero Trust → Settings → Custom Pages → Team domain, e.g. `langarsewa.cloudflareaccess.com`.
- `ACCESS_AUD`: Zero Trust → Access → Applications → the `control.langarsewa.org` application → Overview → Application Audience (AUD) Tag.

## Setting secrets

```bash
# One at a time; wrangler prompts for the value so it never lands in shell history.
wrangler pages secret put GITHUB_APP_ID --project-name control
wrangler pages secret put GITHUB_APP_PRIVATE_KEY --project-name control   # paste the whole PKCS#8 file
wrangler pages secret put GITHUB_APP_INSTALLATION_ID --project-name control
wrangler pages secret put CLOUDFLARE_PAGES_TOKEN --project-name control
wrangler pages secret put CLOUDFLARE_ACCOUNT_ID --project-name control
wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name control
wrangler pages secret put ACCESS_AUD --project-name control
wrangler pages secret list --project-name control
```

`SITE_REPO`, `SITE_PRODUCTION_URL`, `SITE_TEST_URL` and `SITE_PAGES_PROJECT` are plain `[vars]` in
`wrangler.toml`. Never set `DEV_BYPASS_EMAIL` as a Pages secret.

## Running locally

```bash
cp .dev.vars.example .dev.vars
# Fill in the GitHub and Cloudflare values. For a local session without Access, leave
# ACCESS_TEAM_DOMAIN and ACCESS_AUD empty and set DEV_BYPASS_EMAIL=info@langarsewa.org
pnpm dev:functions          # astro build, then wrangler pages dev dist --port 8788
curl -s http://localhost:8788/api/me
curl -s http://localhost:8788/api/status | jq
curl -s -X POST http://localhost:8788/api/publish
```

For a multi-line `GITHUB_APP_PRIVATE_KEY` in `.dev.vars`, wrap the value in double quotes; wrangler
accepts quoted multi-line values.

## Checks before a commit

```bash
pnpm test                                        # vitest, tests/api/*.test.ts
pnpm exec tsc --noEmit -p tsconfig.functions.json
pnpm exec eslint functions tests
pnpm exec prettier --check functions tests
pnpm exec wrangler pages functions build --outdir /tmp/fnbuild   # confirms the bundle compiles
```

Tests stub `fetch` only: Access tokens are signed with a throwaway RS256 key served from a fake JWKS,
and the GitHub App token is minted through the real `@octokit/auth-app` path against a stubbed
`access_tokens` endpoint. No real secrets are needed to run them.
