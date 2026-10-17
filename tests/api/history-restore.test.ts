import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import type { ApiError } from '../../functions/_lib/errors';
import type { HistoryResponse, RestoreResponse } from '../../functions/_lib/types';
import {
  EDITOR,
  OWNER,
  baseRoutes,
  cfDeployment,
  cfEnvelope,
  ghCommit,
  makeAccess,
  makeAppKey,
  makeEnv,
  readJson,
  stubFetch,
  testPeople,
  type AccessFixture,
  type Route,
} from './helpers';

let access: AccessFixture;
let appKey: string;
let ownerJwt: string;
let editorJwt: string;
const app = createApp({ people: testPeople });

beforeAll(async () => {
  [access, appKey] = await Promise.all([makeAccess(), makeAppKey()]);
  [ownerJwt, editorJwt] = await Promise.all([access.sign(OWNER), access.sign(EDITOR)]);
});

afterEach(() => vi.unstubAllGlobals());

const sha = (n: number) => n.toString(16).padStart(40, '0');
const CURRENT = 'dep-current';
const OLDER = 'dep-older';

function deployments(count: number) {
  return Array.from({ length: count }, (_, i) =>
    cfDeployment({
      id: i === 0 ? CURRENT : i === 1 ? OLDER : `dep-${i}`,
      sha: sha(i + 1),
      at: new Date(Date.UTC(2026, 9, 15 - i, 10)).toISOString(),
      message: `Deploy ${i}`,
    }),
  );
}

function cfRoutes(opts: {
  count?: number;
  canonical?: string | null;
  rollbackStatus?: number;
}): Route[] {
  const list = deployments(opts.count ?? 3);
  return [
    ...baseRoutes(access),
    { url: /deployments\?env=production$/, reply: () => cfEnvelope(list) },
    {
      url: /projects\/langarsewa$/,
      reply: () =>
        cfEnvelope({
          name: 'langarsewa',
          canonical_deployment: opts.canonical === null ? null : { id: opts.canonical ?? CURRENT },
        }),
    },
    {
      method: 'GET',
      url: /deployments\/[^/]+$/,
      reply: (_req, url) => {
        const id = url.pathname.split('/').pop();
        const found = list.find((d) => d.id === id);
        return found
          ? Response.json(cfEnvelope(found))
          : Response.json(
              { success: false, errors: [{ code: 8000007, message: 'Deployment not found' }] },
              { status: 404 },
            );
      },
    },
    {
      method: 'POST',
      url: /deployments\/[^/]+\/rollback$/,
      status: opts.rollbackStatus ?? 200,
      reply: () =>
        (opts.rollbackStatus ?? 200) === 200
          ? cfEnvelope(list[1])
          : { success: false, errors: [{ code: 8000000, message: 'Rollback failed' }] },
    },
    {
      url: /\/repos\/langarsewa\/website\/commits\?/,
      reply: () => [
        ghCommit({ sha: sha(1), author: 'Harpreet Kaur' }),
        ghCommit({ sha: sha(2), author: 'Gurdeep Singh' }),
      ],
    },
  ];
}

function restore(jwt: string, body: unknown) {
  return app.request(
    '/api/restore',
    {
      method: 'POST',
      headers: { 'Cf-Access-Jwt-Assertion': jwt, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    makeEnv(appKey),
  );
}

describe('GET /api/history', () => {
  it('lists production deployments newest first with isCurrent on the canonical one', async () => {
    stubFetch(cfRoutes({ count: 3 }));
    const res = await app.request(
      '/api/history',
      { headers: { 'Cf-Access-Jwt-Assertion': editorJwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(200);
    const body = await readJson<HistoryResponse>(res);
    expect(body.deployments.map((d) => d.id)).toEqual([CURRENT, OLDER, 'dep-2']);
    expect(body.deployments[0]).toEqual({
      id: CURRENT,
      url: 'https://dep-curr.langarsewa.pages.dev',
      at: '2026-10-15T10:00:00.000Z',
      commit: sha(1),
      message: 'Deploy 0',
      by: 'Harpreet Kaur',
      environment: 'production',
      isCurrent: true,
    });
    expect(body.deployments[1]?.by).toBe('Gurdeep Singh');
    expect(body.deployments[1]?.isCurrent).toBe(false);
    expect(body.deployments[2]?.by).toBeNull();
  });

  it('caps the list at 20', async () => {
    stubFetch(cfRoutes({ count: 25 }));
    const res = await app.request(
      '/api/history',
      { headers: { 'Cf-Access-Jwt-Assertion': editorJwt } },
      makeEnv(appKey),
    );
    const body = await readJson<HistoryResponse>(res);
    expect(body.deployments).toHaveLength(20);
    expect(body.deployments.filter((d) => d.isCurrent)).toHaveLength(1);
  });
});

describe('POST /api/restore', () => {
  it('rolls back to an older deployment and logs the write', async () => {
    const { calls } = stubFetch(cfRoutes({}));
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const res = await restore(ownerJwt, { deploymentId: OLDER });
    expect(res.status).toBe(200);
    expect(await readJson<RestoreResponse>(res)).toEqual({ ok: true, deploymentId: OLDER });
    const rollback = calls.find((c) => c.method === 'POST' && c.url.endsWith('/rollback'));
    expect(rollback?.url).toContain(`/pages/projects/langarsewa/deployments/${OLDER}/rollback`);
    const audits = log.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, string>,
    );
    expect(audits).toContainEqual(
      expect.objectContaining({
        actor: OWNER,
        action: 'restore.rollback',
        target: OLDER,
        result: 'ok',
      }),
    );
    log.mockRestore();
  });

  it('answers 409 already_current for the live deployment and does not call rollback', async () => {
    const { calls } = stubFetch(cfRoutes({}));
    const res = await restore(ownerJwt, { deploymentId: CURRENT });
    expect(res.status).toBe(409);
    expect((await readJson<ApiError>(res)).error.code).toBe('already_current');
    expect(calls.some((c) => c.url.endsWith('/rollback'))).toBe(false);
  });

  it('falls back to the newest successful deployment when the project has no canonical id', async () => {
    stubFetch(cfRoutes({ canonical: null }));
    const res = await restore(ownerJwt, { deploymentId: CURRENT });
    expect(res.status).toBe(409);
  });

  it('answers 404 for an unknown deployment id', async () => {
    stubFetch(cfRoutes({}));
    const res = await restore(ownerJwt, { deploymentId: 'dep-missing' });
    expect(res.status).toBe(404);
    expect((await readJson<ApiError>(res)).error.code).toBe('not_found');
  });

  it('answers 400 for a malformed body', async () => {
    stubFetch(cfRoutes({}));
    const res = await restore(ownerJwt, { deploymentId: 42 });
    expect(res.status).toBe(400);
  });

  it('refuses editors with 403', async () => {
    const { calls } = stubFetch(cfRoutes({}));
    const res = await restore(editorJwt, { deploymentId: OLDER });
    expect(res.status).toBe(403);
    expect(calls.some((c) => c.url.includes('api.cloudflare.com'))).toBe(false);
  });
});
