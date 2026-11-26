# Hosting and domain

How langarsewa.org is served today, live since Nov 26, 2026. For releasing a change, see
[README.md → Releasing a change](../README.md#releasing-a-change). For undoing one, see
[rollback.md](./rollback.md).

## The setup in one table

| Piece                    | Where it lives                                 | Notes                                                                              |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Website                  | Cloudflare Pages project `langarsewa`          | Deployed only by CI (`.github/workflows/ci.yml`) after every gate passes           |
| Main address             | `https://www.langarsewa.org`                   | Pages custom domain, status Active, Cloudflare-issued certificate                  |
| Bare `langarsewa.org`    | Squarespace                                    | Squarespace's servers answer it and 301 to `https://www.langarsewa.org/`           |
| Domain registration, DNS | Squarespace → Domains → `langarsewa.org` → DNS | The nameservers were never moved to Cloudflare                                     |
| Email                    | Google Workspace (`info@langarsewa.org`)       | Not touched by the website; MX rows sit in Squarespace's "Google Workspace" preset |
| Test site                | `https://dev.langarsewa.pages.dev`             | The `dev` branch                                                                   |
| Previews                 | `https://<branch>.langarsewa.pages.dev`        | One per pull request, linked in a PR comment                                       |
| Raw production URL       | `https://langarsewa.pages.dev`                 | Same build as www; useful for checks that skip DNS                                 |

## DNS at Squarespace

In Squarespace these records sit under **Custom records**. The "Squarespace Defaults" preset was
deleted at cutover because its rows cannot be edited; the four `A @` rows were re-added by hand.

| Type  | Name    | Data                                                                   | Purpose                                           |
| ----- | ------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| CNAME | www     | `langarsewa.pages.dev`                                                 | **The website**                                   |
| A     | @       | `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145` | Bare domain → Squarespace, which redirects to www |
| TXT   | @       | `v=spf1 include:_spf.google.com include:squarespace-mail.com ~all`     | SPF (Google added Nov 26, 2026)                   |
| MX    | @       | `0 langarsewa.org.`                                                    | Legacy; harmless, can be removed                  |
| A     | webmail | `192.185.129.121`                                                      | Legacy host from before Google; can be removed    |
| CNAME | mail    | `langarsewa.org`                                                       | Legacy; can be removed                            |

Presets left in place: **Google Workspace** (five MX rows to `aspmx.l.google.com` and alternates),
**Squarespace Email Campaigns** (`squarespace._domainkey`, `_dmarc` with `v=DMARC1; p=none`) and
**Squarespace Domain Connect**. Never delete a preset box without checking what is inside it.

Squarespace shows a "You're using custom nameservers" banner. It is cosmetic: the domain's
nameserver list mixes Squarespace's and NS1's servers, and both answer with the records above.

The records as they were before any change are kept in
[history/dns-before.md](./history/dns-before.md).

## The one dependency to remember

The bare domain only redirects to www because the **Squarespace website plan** is still active.
Before that plan is cancelled, do one of:

- turn on a forward for the bare domain at Squarespace, if the plan allows it without a site; or
- move the nameservers to Cloudflare, add the zone, and attach `langarsewa.org` to the Pages
  project (it is already listed there, Inactive). Copy every email record first.

The `langarsewa.org` row in Pages → Custom domains is Inactive on purpose. Do not click
Reactivate unless the nameservers have moved.

## Deploys

CI builds once, runs every gate on that build, then runs `wrangler pages deploy` with the branch
name. Cloudflare treats the branch named `main` as production and every other branch as a
preview. A smoke test runs against the deployment URL afterwards.

| GitHub secret or variable | What it is                                                         |
| ------------------------- | ------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`    | Secret. Token with Account › Cloudflare Pages › Edit               |
| `CLOUDFLARE_ACCOUNT_ID`   | Secret. The Cloudflare account that owns the project               |
| `PRODUCTION_URL`          | Variable. `https://www.langarsewa.org`, used by "Production check" |

Without the two secrets the deploy job prints "skipping" and the gates still run.

The "Production check" workflow (`.github/workflows/monitor.yml`) runs the smoke test against
`PRODUCTION_URL` every 30 minutes. A failure emails the repository owner.

## Analytics

Cloudflare Web Analytics, free and cookie-free (no consent banner needed). Cloudflare does not
collect visitor numbers for this site on its own, because the domain is not a Cloudflare zone;
the beacon has to be switched on once:

1. Cloudflare dashboard → Workers & Pages → `langarsewa` → **Metrics** → **Web Analytics** →
   Enable.
2. Push any change through to `main` (or redeploy the latest production deployment). Cloudflare
   adds the beacon to pages from the next deployment.
3. Numbers appear under Analytics & Logs → Web Analytics within a few minutes of real visits.

`public/_headers` already allows the beacon (`static.cloudflareinsights.com` in `script-src`,
`cloudflareinsights.com` in `connect-src`). Leave `analytics.enabled` in `site.json` off: that
switch adds the same beacon by hand and is only for a setup without the dashboard option.
Turning both on counts every visit twice.

## Security headers

`public/_headers` sets the CSP and the other security headers for every response. HSTS is still
commented out. It can be switched on for www now that HTTPS works there; use
`max-age=31536000` without `preload`, because preload needs the bare domain to serve HSTS too.
