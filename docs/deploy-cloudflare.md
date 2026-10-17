# Deploying on Cloudflare Pages

Production target: `https://langarsewa.org` (apex), with `www` redirecting to it. Deploys are
direct uploads from the CI workflow after every gate passes; pull requests get a preview URL.

## Pieces

| Piece                         | Where                                             | Who                                                                                  |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pages project `langarsewa`    | Cloudflare → Workers & Pages                      | created with `wrangler pages project create`                                         |
| API token `langarsewa-deploy` | Cloudflare → My Profile → API Tokens              | Hardeep creates; stored via `~/code/store-cloudflare-token.sh` and as GitHub secrets |
| GitHub secrets                | repo → Settings → Secrets and variables → Actions | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`                                      |
| DNS zone                      | Cloudflare → Add a domain → `langarsewa.org`      | records reviewed against `docs/dns-before.md` before nameservers move                |

Token permissions: Account › Cloudflare Pages › Edit; Zone › DNS › Edit; Zone › Zone › Read; zone
resources limited to `langarsewa.org`.

## Order of operations

1. `wrangler pages project create langarsewa --production-branch main`, then a first
   `wrangler pages deploy dist` to get `langarsewa.pages.dev` and verify the whole suite against it.
2. Add the GitHub secrets; the next push to `main` deploys from CI.
3. Add the zone in Cloudflare; compare the imported records with `docs/dns-before.md`. Every MX,
   SPF, DMARC and DKIM row must be present before step 4. Add the Pages records:
   `langarsewa.org` CNAME `langarsewa.pages.dev` (proxied, flattened at the apex) and
   `www` CNAME `langarsewa.pages.dev` (proxied).
4. Attach `langarsewa.org` and `www.langarsewa.org` as custom domains of the Pages project
   (`wrangler pages domain add`, or the dashboard).
5. At Squarespace: Domains → `langarsewa.org` → DNS settings → Nameservers → custom → paste the
   two Cloudflare nameservers. Registration and renewal stay at Squarespace.
6. When the zone shows Active: HTTPS on apex and `www`; `www` redirects to the apex; every entry
   in `public/_redirects`; `?lang=pa`; a test email to `info@langarsewa.org`; `dig MX` matches
   `docs/dns-before.md`.
7. Enable HSTS in `public/_headers` (uncomment the line), push, confirm the header.
8. Switch the canonical host back to the apex in `astro.config.mjs` and `src/content/site.json`
   (done in the cutover commit), remove the GitHub Pages deploy job and `public/CNAME`.

## Rollback

Set the nameservers at Squarespace back to the eight recorded in `docs/dns-before.md`
(`ns01-04.squarespacedns.com`, `dns1-4.p07.nsone.net`). Propagation is minutes to a few hours.
Until then, the GitHub Pages deployment at `www` keeps serving as a fallback.
