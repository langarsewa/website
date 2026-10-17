/** Bindings exposed to Pages Functions: [vars] from wrangler.toml plus encrypted secrets. */
export type Bindings = {
  SITE_REPO: string;
  SITE_PRODUCTION_URL: string;
  SITE_TEST_URL: string;
  SITE_PAGES_PROJECT: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_INSTALLATION_ID: string;
  CLOUDFLARE_PAGES_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local only. Ignored whenever ACCESS_TEAM_DOMAIN is set. */
  DEV_BYPASS_EMAIL?: string;
};

export type Role = 'owner' | 'editor';

export type Actor = { email: string; role: Role };

export type AppEnv = {
  Bindings: Bindings;
  Variables: { actor: Actor };
};

/** Treats unset and blank values the same, so a blank line in .dev.vars does not count as configured. */
export function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
