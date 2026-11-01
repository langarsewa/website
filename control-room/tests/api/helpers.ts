import { vi } from 'vitest';
import {
  SignJWT,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  type JWK,
  type KeyObject,
  type CryptoKey,
} from 'jose';
import type { Bindings } from '../../functions/_lib/env';

export const TEAM_DOMAIN = 'langarsewa.cloudflareaccess.com';
export const AUDIENCE = 'test-audience-tag';
export const OWNER = 'info@langarsewa.org';
export const EDITOR = 'editor@example.org';
export const STRANGER = 'nobody@example.org';

export const testPeople = { owners: [OWNER], editors: [EDITOR] };

type SigningKey = CryptoKey | KeyObject;

export type AccessFixture = {
  jwks: { keys: JWK[] };
  /** Signs a valid Access token for `email`. */
  sign(
    email: string,
    overrides?: { issuer?: string; audience?: string; key?: SigningKey },
  ): Promise<string>;
  /** A second key that is not in the JWKS, for forged-token tests. */
  rogueKey: SigningKey;
};

export async function makeAccess(): Promise<AccessFixture> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const rogue = await generateKeyPair('RS256', { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'access-key-1';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  return {
    jwks: { keys: [jwk] },
    rogueKey: rogue.privateKey,
    sign(email, overrides = {}) {
      return new SignJWT({ email })
        .setProtectedHeader({ alg: 'RS256', kid: 'access-key-1' })
        .setIssuer(overrides.issuer ?? `https://${TEAM_DOMAIN}`)
        .setAudience(overrides.audience ?? AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(overrides.key ?? privateKey);
    },
  };
}

/** A throwaway RSA key in PKCS#8, the format the GitHub App secret must be in. */
export async function makeAppKey(): Promise<string> {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  return exportPKCS8(privateKey);
}

export function makeEnv(appKey: string, overrides: Partial<Bindings> = {}): Bindings {
  return {
    SITE_REPO: 'langarsewa/website',
    SITE_PRODUCTION_URL: 'https://langarsewa.org',
    SITE_TEST_URL: 'https://dev.langarsewa.pages.dev',
    SITE_PAGES_PROJECT: 'langarsewa',
    GITHUB_APP_ID: '12345',
    GITHUB_APP_PRIVATE_KEY: appKey,
    GITHUB_APP_INSTALLATION_ID: '67890',
    CLOUDFLARE_PAGES_TOKEN: 'cf-token-for-tests',
    CLOUDFLARE_ACCOUNT_ID: 'acct0000',
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    ACCESS_AUD: AUDIENCE,
    ...overrides,
  };
}

export type RecordedCall = { method: string; url: string; body: string | null };

export type Route = {
  method?: string;
  url: RegExp | string;
  reply: (req: Request, url: URL) => unknown;
  status?: number;
};

export type FetchStub = { calls: RecordedCall[] };

/** Replaces global fetch for the current test. Unmatched requests answer 599 so a missing stub fails loudly. */
export function stubFetch(routes: Route[]): FetchStub {
  const calls: RecordedCall[] = [];
  const impl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const req =
      typeof input === 'string' || input instanceof URL
        ? new Request(input.toString(), init)
        : new Request(input, init);
    const body = req.method === 'GET' || req.method === 'HEAD' ? null : await req.clone().text();
    calls.push({ method: req.method, url: req.url, body });
    const url = new URL(req.url);
    for (const route of routes) {
      if (route.method && route.method !== req.method) continue;
      const hit =
        typeof route.url === 'string' ? req.url.includes(route.url) : route.url.test(req.url);
      if (!hit) continue;
      const out = await route.reply(req, url);
      return out instanceof Response ? out : Response.json(out, { status: route.status ?? 200 });
    }
    return Response.json({ message: `unstubbed ${req.method} ${req.url}` }, { status: 599 });
  };
  vi.stubGlobal('fetch', vi.fn(impl));
  return { calls };
}

/** Routes every test needs: Access certs and the GitHub App installation token. */
export function baseRoutes(access: AccessFixture): Route[] {
  return [
    { url: `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`, reply: () => access.jwks },
    {
      method: 'POST',
      url: /api\.github\.com\/app\/installations\/67890\/access_tokens$/,
      status: 201,
      reply: () => ({
        token: 'ghs_test_installation_token',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        permissions: { contents: 'write', pull_requests: 'write' },
        repository_selection: 'selected',
      }),
    },
  ];
}

export function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

/* ---------- Fixture payloads shaped like the upstream APIs ---------- */

export function cfDeployment(over: {
  id: string;
  env?: 'production' | 'preview';
  branch?: string;
  sha?: string;
  message?: string;
  at?: string;
  status?: string;
}) {
  return {
    id: over.id,
    url: `https://${over.id.slice(0, 8)}.langarsewa.pages.dev`,
    environment: over.env ?? 'production',
    created_on: over.at ?? '2026-10-10T10:00:00Z',
    modified_on: over.at ?? '2026-10-10T10:02:00Z',
    latest_stage: {
      name: 'deploy',
      status: over.status ?? 'success',
      ended_on: over.at ?? '2026-10-10T10:02:00Z',
    },
    deployment_trigger: {
      type: 'github:push',
      metadata: {
        branch: over.branch ?? (over.env === 'preview' ? 'dev' : 'main'),
        commit_hash: over.sha ?? 'a'.repeat(40),
        commit_message: over.message ?? 'Update home page\n\nLonger body here.',
      },
    },
    aliases: null,
  };
}

export function cfEnvelope<T>(result: T) {
  return { success: true, errors: [], messages: [], result };
}

export function ghRun(over: {
  name: string;
  branch?: string;
  status?: string;
  conclusion?: string | null;
  id?: number;
  at?: string;
}) {
  const id = over.id ?? 1;
  return {
    id,
    name: over.name,
    head_branch: over.branch ?? 'main',
    status: over.status ?? 'completed',
    conclusion: over.conclusion === undefined ? 'success' : over.conclusion,
    html_url: `https://github.com/langarsewa/website/actions/runs/${id}`,
    created_at: over.at ?? '2026-10-10T09:00:00Z',
    updated_at: over.at ?? '2026-10-10T09:05:00Z',
    event: 'push',
  };
}

export function ghCommit(over: {
  sha: string;
  message?: string;
  author?: string;
  date?: string;
  parents?: number;
  files?: string[];
}) {
  return {
    sha: over.sha,
    html_url: `https://github.com/langarsewa/website/commit/${over.sha}`,
    commit: {
      message: over.message ?? `Change ${over.sha.slice(0, 7)}`,
      author: {
        name: over.author ?? 'Sewadar One',
        email: 'one@example.org',
        date: over.date ?? '2026-10-09T12:00:00Z',
      },
      committer: {
        name: 'GitHub',
        email: 'noreply@github.com',
        date: over.date ?? '2026-10-09T12:00:00Z',
      },
    },
    author: { login: (over.author ?? 'sewadar-one').toLowerCase().replace(/\s+/g, '-') },
    parents: Array.from({ length: over.parents ?? 1 }, (_, i) => ({ sha: `${i}`.repeat(40) })),
    files: (over.files ?? []).map((filename) => ({ filename, status: 'modified' })),
  };
}

export function ghPull(over: { number: number; sha: string; state?: string }) {
  return {
    number: over.number,
    state: over.state ?? 'open',
    html_url: `https://github.com/langarsewa/website/pull/${over.number}`,
    title: 'Publish to langarsewa.org',
    head: { ref: 'dev', sha: over.sha },
    base: { ref: 'main', sha: 'b'.repeat(40) },
    merged: false,
  };
}

export function ghCheckRuns(runs: { name: string; status: string; conclusion: string | null }[]) {
  return {
    total_count: runs.length,
    check_runs: runs.map((r, i) => ({
      id: i + 1,
      ...r,
      html_url: `https://github.com/check/${i + 1}`,
    })),
  };
}
