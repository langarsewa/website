# DNS before migration — langarsewa.org

Recorded 2026-10-17 07:33 UTC with `dig` from Hardeep's laptop, before any change at Squarespace or Cloudflare. Every record here must exist in Cloudflare before the nameservers move; the MX, SPF, DKIM and DMARC rows decide whether email keeps working.

## Nameservers and SOA

```
langarsewa.org.		3600	IN	NS	ns04.squarespacedns.com.
langarsewa.org.		3600	IN	NS	dns2.p07.nsone.net.
langarsewa.org.		3600	IN	NS	ns02.squarespacedns.com.
langarsewa.org.		3600	IN	NS	dns1.p07.nsone.net.
langarsewa.org.		3600	IN	NS	dns4.p07.nsone.net.
langarsewa.org.		3600	IN	NS	dns3.p07.nsone.net.
langarsewa.org.		3600	IN	NS	ns01.squarespacedns.com.
langarsewa.org.		3600	IN	NS	ns03.squarespacedns.com.
langarsewa.org.		3600	IN	SOA	dns1.p07.nsone.net. hostmaster.nsone.net. 1589923319 43200 7200 1209600 3600
```

## langarsewa.org

```
langarsewa.org.		3600	IN	A	198.185.159.144
langarsewa.org.		3600	IN	A	198.185.159.145
langarsewa.org.		3600	IN	A	198.49.23.144
langarsewa.org.		3600	IN	A	198.49.23.145
langarsewa.org.		3600	IN	MX	1 aspmx.l.google.com.
langarsewa.org.		3600	IN	MX	5 alt2.aspmx.l.google.com.
langarsewa.org.		3600	IN	MX	0 langarsewa.org.
langarsewa.org.		3600	IN	MX	10 alt3.aspmx.l.google.com.
langarsewa.org.		3600	IN	MX	10 alt4.aspmx.l.google.com.
langarsewa.org.		3600	IN	MX	5 alt1.aspmx.l.google.com.
langarsewa.org.		3600	IN	TXT	"v=spf1 include:squarespace-mail.com ~all"
```

## www.langarsewa.org

```
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
ext-sq.squarespace.com.	300	IN	A	198.185.159.145
ext-sq.squarespace.com.	300	IN	A	198.185.159.144
ext-sq.squarespace.com.	300	IN	A	198.49.23.144
ext-sq.squarespace.com.	300	IN	A	198.49.23.145
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
www.langarsewa.org.	3600	IN	CNAME	ext-sq.squarespace.com.
```

## Email and verification subdomains

```
_dmarc.langarsewa.org.	3600	IN	HINFO	"RFC8482" ""
_dmarc.langarsewa.org.	3600	IN	TXT	"v=DMARC1; p=none"
langarsewa.org.		3598	IN	A	198.185.159.144
langarsewa.org.		3598	IN	A	198.185.159.145
langarsewa.org.		3598	IN	A	198.49.23.144
langarsewa.org.		3598	IN	A	198.49.23.145
langarsewa.org.		3598	IN	MX	0 langarsewa.org.
langarsewa.org.		3598	IN	MX	1 aspmx.l.google.com.
langarsewa.org.		3598	IN	MX	10 alt3.aspmx.l.google.com.
langarsewa.org.		3598	IN	MX	10 alt4.aspmx.l.google.com.
langarsewa.org.		3598	IN	MX	5 alt1.aspmx.l.google.com.
langarsewa.org.		3598	IN	MX	5 alt2.aspmx.l.google.com.
langarsewa.org.		3598	IN	TXT	"v=spf1 include:squarespace-mail.com ~all"
mail.langarsewa.org.	3600	IN	CNAME	langarsewa.org.
webmail.langarsewa.org.	3600	IN	A	192.185.129.121
webmail.langarsewa.org.	3600	IN	HINFO	"RFC8482" ""
_domainconnect.domains.squarespace.com.	1800 IN	TXT "domains.squarespace.com"
_domainconnect.langarsewa.org. 3600 IN	CNAME	_domainconnect.domains.squarespace.com.
```

## Where the site is served from today

```
HTTP/2 301
location: https://www.langarsewa.org/
server: Squarespace
x-contextid: 1FluK6gU/XmhxyVAa
```

## Registrar

```
Creation Date: 2018-09-21T07:15:59
Creation Date: 2018-09-21T07:15:59Z
Name Server: dns1.p07.nsone.net
Name Server: dns1.p07.nsone.net
Name Server: dns2.p07.nsone.net
Name Server: dns2.p07.nsone.net
Name Server: dns3.p07.nsone.net
Name Server: dns3.p07.nsone.net
Name Server: dns4.p07.nsone.net
Name Server: dns4.p07.nsone.net
Name Server: ns01.squarespacedns.com
Name Server: ns01.squarespacedns.com
```

## What this tells us

- **Email is Google Workspace.** MX points at `aspmx.l.google.com` and its alternates, so
  `info@langarsewa.org` is served by Google. These five MX rows must be recreated in Cloudflare
  first. The extra `MX 0 langarsewa.org.` row is unusual (it points mail at the web host) and
  should be carried over unchanged until email is confirmed working, then reviewed.
- **SPF only authorises Squarespace mail** (`include:squarespace-mail.com`), not Google
  (`include:_spf.google.com`). Mail sent from Google may already be failing SPF; this is a
  pre-existing gap, not caused by the migration. Carry the record over as is, and raise it as
  an open item.
- **DMARC is `p=none`** (monitor only). Carry over as is.
- **No DKIM record was found** at the common selectors (`google`, `default`, `selector1/2`, `k1`).
  Google's selector is normally `google._domainkey`; it may simply not be set up. The
  Squarespace DNS screen will show any selector that exists; copy it exactly.
- **Legacy rows:** `mail` CNAME to the apex, `webmail` A `192.185.129.121` (an old hosting
  provider), and `_domainconnect` for Squarespace. Carry `mail` and `webmail` over unchanged;
  `_domainconnect` can be dropped once the site no longer lives at Squarespace.
- **Web today:** apex A records are Squarespace's four IPs; `www` is a CNAME to
  `ext-sq.squarespace.com`; the apex 301s to `www`. In Cloudflare both become CNAMEs to the
  Pages project (apex flattened), and `www` redirects to the apex.
- **Nameservers today:** `ns0{1..4}.squarespacedns.com` plus `dns{1..4}.p07.nsone.net`. The
  rollback is to set these eight back at Squarespace (see `docs/rollback.md`, written at the
  switch step).
