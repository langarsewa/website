# Rollback

Two different things can go wrong. Undo the one that went wrong; neither undo touches email.

## A bad change on the site

Production is whatever the last green `main` deploy produced.

**Fastest, no code (about one minute):** Cloudflare dashboard → Workers & Pages → `langarsewa` →
Deployments → find the previous **Production** deployment → ⋯ → **Rollback to this deployment**.

**Then make it stick:** revert the commit on `main` so the next deploy does not bring the problem
back.

```bash
git switch main && git pull
git revert <commit>          # one commit per bad change
git push origin main         # CI redeploys in about 7 minutes
git switch dev && git merge --ff-only main && git push origin dev
```

## The domain: put www back on Squarespace

Use this only if www.langarsewa.org itself is unreachable (DNS or certificate trouble), not for a
content problem.

1. Squarespace → Domains → `langarsewa.org` → DNS → **Custom records**.
2. Edit the `CNAME` row `www` and set its data back to `ext-sq.squarespace.com`. Save.
3. Visitors see the old Squarespace site again within minutes to 4 hours (the record's TTL).

This works only while the Squarespace website plan is active. The new site stays reachable the
whole time at `https://langarsewa.pages.dev`.

To return to the new site, set the `www` row to `langarsewa.pages.dev` again. Pages keeps the
custom domain attached, so nothing needs redoing at Cloudflare.

## Checking where www points

```bash
dig +short @8.8.8.8 www.langarsewa.org            # langarsewa.pages.dev = new site
dig +short @ns01.squarespacedns.com www.langarsewa.org   # what Squarespace is publishing
dig +short MX langarsewa.org                      # five Google rows plus "0 langarsewa.org."
```

If your own computer still shows the old site after a change, its DNS cache is stale. Try a phone
on mobile data, or wait for the TTL to run out.
