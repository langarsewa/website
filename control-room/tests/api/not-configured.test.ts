import { describe, expect, it } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import type { Bindings } from '../../functions/_lib/env';

const people = { owners: ['info@langarsewa.org'], editors: [] };

function bareEnv(): Bindings {
  return {
    SITE_REPO: 'langarsewa/website',
    SITE_PRODUCTION_URL: 'https://langarsewa.org',
    SITE_TEST_URL: 'https://dev.langarsewa.pages.dev',
    SITE_PAGES_PROJECT: 'langarsewa',
    GITHUB_APP_ID: '',
    GITHUB_APP_PRIVATE_KEY: '',
    GITHUB_APP_INSTALLATION_ID: '',
    CLOUDFLARE_PAGES_TOKEN: '',
    CLOUDFLARE_ACCOUNT_ID: '',
    DEV_BYPASS_EMAIL: 'info@langarsewa.org',
  };
}

describe('before the secrets exist', () => {
  it('/api/me still works', async () => {
    const res = await createApp({ people }).request('/api/me', {}, bareEnv());
    expect(res.status).toBe(200);
  });

  it('upstream routes answer 503 not_configured and name what is missing', async () => {
    for (const path of ['/api/status', '/api/pending', '/api/history', '/api/publish/current']) {
      const res = await createApp({ people }).request(path, {}, bareEnv());
      expect(res.status, path).toBe(503);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('not_configured');
      expect(body.error.message).toContain('GITHUB_APP_ID');
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });
});
