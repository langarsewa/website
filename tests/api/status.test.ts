import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import type { StatusResponse } from '../../functions/_lib/types';
import {
  OWNER,
  baseRoutes,
  cfDeployment,
  cfEnvelope,
  ghCommit,
  ghRun,
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
let jwt: string;
const app = createApp({ people: testPeople });

beforeAll(async () => {
  [access, appKey] = await Promise.all([makeAccess(), makeAppKey()]);
  jwt = await access.sign(OWNER);
});

afterEach(() => vi.unstubAllGlobals());

const PROD_SHA = 'c'.repeat(40);
const OLD_SHA = 'd'.repeat(40);
const DEV_SHA = 'e'.repeat(40);

function get() {
  return app.request(
    '/api/status',
    { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
    makeEnv(appKey),
  );
}

describe('GET /api/status', () => {
  it('shapes production, test, ci and check from upstream payloads', async () => {
    const routes: Route[] = [
      ...baseRoutes(access),
      {
        url: /pages\/projects\/langarsewa\/deployments\?env=production$/,
        reply: () =>
          cfEnvelope([
            cfDeployment({
              id: 'p-fail',
              sha: 'f'.repeat(40),
              at: '2026-10-12T10:00:00Z',
              status: 'failure',
            }),
            cfDeployment({
              id: 'p-live',
              sha: PROD_SHA,
              at: '2026-10-11T10:00:00Z',
              message: 'Fix hours\n\nbody',
            }),
            cfDeployment({ id: 'p-old', sha: OLD_SHA, at: '2026-10-01T10:00:00Z' }),
          ]),
      },
      {
        url: /pages\/projects\/langarsewa\/deployments\?env=preview$/,
        reply: () =>
          cfEnvelope([
            cfDeployment({
              id: 'v-feature',
              env: 'preview',
              branch: 'feature-x',
              at: '2026-10-13T10:00:00Z',
            }),
            cfDeployment({
              id: 'v-dev',
              env: 'preview',
              branch: 'dev',
              sha: DEV_SHA,
              at: '2026-10-12T11:00:00Z',
            }),
          ]),
      },
      {
        url: /pages\/projects\/langarsewa$/,
        reply: () => cfEnvelope({ name: 'langarsewa', canonical_deployment: { id: 'p-live' } }),
      },
      {
        url: /actions\/runs\?/,
        reply: (_req, url) => {
          const branch = url.searchParams.get('branch');
          if (branch === 'main') {
            return {
              workflow_runs: [
                ghRun({ id: 11, name: 'CI', branch: 'main', at: '2026-10-11T09:00:00Z' }),
              ],
            };
          }
          if (branch === 'dev') {
            return {
              workflow_runs: [
                ghRun({
                  id: 21,
                  name: 'CI',
                  branch: 'dev',
                  status: 'in_progress',
                  conclusion: null,
                }),
                ghRun({ id: 20, name: 'CI', branch: 'dev' }),
              ],
            };
          }
          return {
            workflow_runs: [
              ghRun({ id: 31, name: 'Production check', status: 'in_progress', conclusion: null }),
              ghRun({
                id: 30,
                name: 'Production check',
                conclusion: 'failure',
                at: '2026-10-11T12:00:00Z',
              }),
              ghRun({ id: 11, name: 'CI', branch: 'main' }),
            ],
          };
        },
      },
      {
        url: `/commits/${PROD_SHA}`,
        reply: () => ghCommit({ sha: PROD_SHA, author: 'Harpreet Kaur' }),
      },
      {
        url: `/commits/${DEV_SHA}`,
        reply: () => ghCommit({ sha: DEV_SHA, author: 'Gurdeep Singh' }),
      },
    ];
    stubFetch(routes);

    const res = await get();
    expect(res.status).toBe(200);
    const body = await readJson<StatusResponse>(res);
    expect(body.production).toEqual({
      url: 'https://langarsewa.org',
      deploymentId: 'p-live',
      commit: PROD_SHA,
      message: 'Fix hours',
      at: '2026-10-11T10:00:00Z',
      by: 'Harpreet Kaur',
    });
    expect(body.test).toEqual({
      url: 'https://dev.langarsewa.pages.dev',
      deploymentId: 'v-dev',
      commit: DEV_SHA,
      message: 'Update home page',
      at: '2026-10-12T11:00:00Z',
      by: 'Gurdeep Singh',
    });
    expect(body.ci.main).toEqual({
      status: 'completed',
      conclusion: 'success',
      url: 'https://github.com/langarsewa/website/actions/runs/11',
      at: '2026-10-11T09:00:00Z',
    });
    expect(body.ci.dev.status).toBe('in_progress');
    expect(body.ci.dev.conclusion).toBeNull();
    // Latest *completed* Production check decides ok; the in-progress one is ignored.
    expect(body.check).toEqual({
      ok: false,
      at: '2026-10-11T12:00:00Z',
      url: 'https://github.com/langarsewa/website/actions/runs/30',
    });
  });

  it('prefers the canonical deployment after a rollback over the newest successful one', async () => {
    stubFetch([
      ...baseRoutes(access),
      {
        url: /deployments\?env=production$/,
        reply: () =>
          cfEnvelope([
            cfDeployment({ id: 'p-new', sha: PROD_SHA, at: '2026-10-11T10:00:00Z' }),
            cfDeployment({ id: 'p-old', sha: OLD_SHA, at: '2026-10-01T10:00:00Z' }),
          ]),
      },
      { url: /deployments\?env=preview$/, reply: () => cfEnvelope([]) },
      {
        url: /projects\/langarsewa$/,
        reply: () => cfEnvelope({ name: 'langarsewa', canonical_deployment: { id: 'p-old' } }),
      },
      { url: /actions\/runs\?/, reply: () => ({ workflow_runs: [] }) },
      {
        url: `/commits/${OLD_SHA}`,
        reply: () => ghCommit({ sha: OLD_SHA, author: 'Older Author' }),
      },
    ]);
    const body = await readJson<StatusResponse>(await get());
    expect(body.production.deploymentId).toBe('p-old');
    expect(body.production.by).toBe('Older Author');
    expect(body.test).toEqual({
      url: 'https://dev.langarsewa.pages.dev',
      deploymentId: null,
      commit: null,
      message: null,
      at: null,
      by: null,
    });
    expect(body.ci.main).toEqual({ status: null, conclusion: null, url: null, at: null });
    expect(body.check).toEqual({ ok: false, at: null, url: null });
  });

  it('answers 502 upstream_error when Cloudflare refuses the token', async () => {
    stubFetch([
      ...baseRoutes(access),
      {
        url: /pages\/projects/,
        status: 403,
        reply: () => ({
          success: false,
          errors: [{ code: 10000, message: 'Authentication error' }],
          result: null,
        }),
      },
      { url: /actions\/runs\?/, reply: () => ({ workflow_runs: [] }) },
    ]);
    const res = await get();
    expect(res.status).toBe(502);
    const body = await readJson<{ error: { code: string; message: string } }>(res);
    expect(body.error.code).toBe('upstream_error');
    expect(body.error.message).toContain('Authentication error');
  });
});
