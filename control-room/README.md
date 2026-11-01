# Sewa Control Room

A phone-first console for Dhan Guru Ramdas Langar Sewa: see the website's status, make a change,
publish it, restore an earlier version, or ask for something bigger, without touching GitHub,
Cloudflare or Squarespace.

Design and contracts: [docs/architecture.md](./docs/architecture.md).

- Web app: Astro, in `src/`, served by Cloudflare Pages at `https://control.langarsewa.org`.
- API: Cloudflare Pages Functions (Hono) in `functions/api/`, same deployment, holds the secrets.
- Sign-in: Cloudflare Access in front of the hostname; roles from `config/people.json`.

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in, see docs/architecture.md
pnpm dev:functions               # builds and serves app + API on http://localhost:8788
pnpm test && pnpm check && pnpm lint
```
