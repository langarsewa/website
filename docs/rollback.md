# Rollback: put DNS back on Squarespace

Use this if anything is wrong after the nameserver switch (site unreachable, email not arriving).
It reverses the switch only; nothing at Cloudflare needs to be deleted first.

## Steps (about five minutes, then propagation)

1. Squarespace → Domains → `langarsewa.org` → DNS settings → Nameservers.
2. Choose Squarespace's own nameservers (the "use Squarespace nameservers" option). If the
   screen asks for custom values instead, enter the eight recorded before the switch:

   | Nameservers before the switch (from `docs/dns-before.md`) |
   | --------------------------------------------------------- |
   | `ns01.squarespacedns.com`                                 |
   | `ns02.squarespacedns.com`                                 |
   | `ns03.squarespacedns.com`                                 |
   | `ns04.squarespacedns.com`                                 |
   | `dns1.p07.nsone.net`                                      |
   | `dns2.p07.nsone.net`                                      |
   | `dns3.p07.nsone.net`                                      |
   | `dns4.p07.nsone.net`                                      |

3. Save. Squarespace's DNS zone was never changed, so every original record (site, MX, SPF,
   DMARC, `mail`, `webmail`) comes back exactly as it was.
4. Check with `dig NS langarsewa.org` and `dig MX langarsewa.org`; resolvers pick the change up
   within minutes to a few hours.

## What stays available during rollback

- Email: the Google MX records exist identically at Squarespace and Cloudflare, so mail keeps
  flowing whichever side answers.
- The new site remains reachable at `https://langarsewa.pages.dev` the whole time.

## Cloudflare side after a rollback

Nothing is required. The zone simply shows "Pending" again. The Pages project, its custom domains
and the records stay ready for a second attempt.
