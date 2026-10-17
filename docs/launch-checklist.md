# Launch checklist

Everything below the line "Cutover" changes what visitors see. Everything above it can be done
any time. Owner for each step is in brackets.

## Before cutover

- [x] Site built, every gate green locally and in CI (content parity 1,595 strings, visual parity
      28 pairs, interaction, axe, Lighthouse, links, redirects).
- [x] Cloudflare Pages project `langarsewa`; production from `main`, test site from `dev`,
      previews per pull request; smoke test after every deploy.
- [x] Zone `langarsewa.org` on Cloudflare: records imported and verified against
      `docs/dns-before.md`; apex and `www` point at the Pages project; email rows untouched;
      both hostnames attached to the project (pending until the zone is active).
- [x] Rollback written: `docs/rollback.md`.
- [ ] GitHub Pages switched off in the repository settings. [Hardeep]
- [ ] Scheduled production check enabled: repository variable `PRODUCTION_URL` set to
      `https://langarsewa.org` after cutover (until then it checks `langarsewa.pages.dev`). [Hardeep]
- [ ] Screenshot of Squarespace DNS kept for the record (DKIM selectors, anything `dig` missed). [Hardeep]

## Cutover (about 10 minutes of work, propagation minutes to hours)

1. Squarespace → Domains → `langarsewa.org` → DNS settings → Nameservers → custom:
   `bjorn.ns.cloudflare.com`, `kay.ns.cloudflare.com`. Save. [Hardeep]
2. Watch the zone turn Active in Cloudflare (`dig NS langarsewa.org`). [Claude]
3. Verify, in this order: [Claude]
   - `https://langarsewa.org/` and `/pa/` load with the padlock; `https://www.langarsewa.org/`
     redirects to the apex;
   - every entry in `public/_redirects` (`/about`, `/sewa`, `/media-gallery`, `/donate`, `/covid`,
     `/contact`, `/punjabi`) answers 301 to the right page;
   - `/?lang=pa` opens the Punjabi home; `/#/impact/milestones` lands on `/impact/#milestones`;
   - `dig MX langarsewa.org` matches `docs/dns-before.md`; SPF and DMARC TXT unchanged;
   - the smoke test passes against `https://langarsewa.org`.
4. Send a test email to `info@langarsewa.org` from an outside account and confirm it arrives. [Hardeep]
5. Cloudflare zone settings: Always Use HTTPS on, minimum TLS 1.2, Automatic HTTPS Rewrites on. [Claude]
6. Uncomment the HSTS line in `public/_headers`, merge `dev` → `main`, confirm the header is served. [Claude]
7. Set the repository variable `PRODUCTION_URL` to `https://langarsewa.org`. [Hardeep]

## After cutover

- Keep the domain registration and auto-renew at Squarespace. Cancel only the Squarespace
  website plan, after two stable weeks.
- Add a second owner from the sewa side on GitHub and Cloudflare.
- Delete the broad `langarsewa-deploy` Cloudflare token and `~/.config/langarsewa/cloudflare.env`.
- Decide the open items in `OPEN-ITEMS.md` (Explore link contrast, placeholders, Punjabi review,
  SPF for Google Workspace).
- Switch the visual and content parity gates from "match the reference" to "match the last
  published version" before the first content edit by the sewa.

## If anything is wrong

`docs/rollback.md`: nameservers back to Squarespace (DNS), or Cloudflare rollback / `git revert`
(content). Email keeps working either way because the MX records are identical on both sides.
