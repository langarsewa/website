# Deploying on GitHub Pages

Production is `https://www.langarsewa.org`, served by GitHub Pages from the `main` branch. The
CI workflow (`.github/workflows/ci.yml`) builds the site, runs every gate, and only then uploads
`dist/` and deploys it. A failing gate blocks the deploy.

## One-time setup (repository owner, in the browser)

1. GitHub → `langarsewa/website` → Settings → Pages.
2. Build and deployment → Source: **GitHub Actions**.
3. Custom domain: `www.langarsewa.org` → Save. GitHub checks DNS and shows a warning until the
   record below exists.
4. After the DNS check passes, tick **Enforce HTTPS**.

## DNS at Squarespace (domain registrar and DNS host stay as they are)

Domains → `langarsewa.org` → DNS settings. Change one record:

| Host  | Type  | Old value                | New value              |
| ----- | ----- | ------------------------ | ---------------------- |
| `www` | CNAME | `ext-sq.squarespace.com` | `langarsewa.github.io` |

Leave every other record alone (A records for the apex, all MX, TXT, `mail`, `webmail`). The apex
keeps redirecting to `www` through Squarespace, as it does today, so `langarsewa.org` reaches the
new site as well.

Rollback: set the `www` CNAME back to `ext-sq.squarespace.com`. Propagation is minutes to an hour.

## Later: move the apex off Squarespace too

When the Squarespace website plan is cancelled, the apex redirect disappears. Before that, point the
apex at GitHub Pages so GitHub redirects it to `www`:

| Host | Type | Value                                                                                      |
| ---- | ---- | ------------------------------------------------------------------------------------------ |
| `@`  | A    | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`                 |
| `@`  | AAAA | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |

(Values from GitHub's Pages documentation; confirm there before applying.)

## Verify after the switch

- `https://www.langarsewa.org/` and `/pa/` load over HTTPS with the padlock.
- `https://langarsewa.org/` lands on `www`.
- `/about`, `/donate`, `/punjabi` reach the right pages.
- A test email to `info@langarsewa.org` arrives.
