import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { evaluateChecks } from '../../functions/_lib/routes/publish';
import type { ApiError } from '../../functions/_lib/errors';
import type { PublishIdle, PublishResponse } from '../../functions/_lib/types';
import {
  EDITOR,
  OWNER,
  baseRoutes,
  ghCheckRuns,
  ghPull,
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

const HEAD_SHA = '9'.repeat(40);

beforeAll(async () => {
  [access, appKey] = await Promise.all([makeAccess(), makeAppKey()]);
  [ownerJwt, editorJwt] = await Promise.all([access.sign(OWNER), access.sign(EDITOR)]);
});

afterEach(() => vi.unstubAllGlobals());

type Check = { name: string; status: string; conclusion: string | null };

function publishRoutes(opts: { openPr: boolean; checks: Check[]; mergeStatus?: number }): Route[] {
  return [
    ...baseRoutes(access),
    {
      method: 'GET',
      url: /\/repos\/langarsewa\/website\/pulls\?/,
      reply: (_req, url) => {
        expect(url.searchParams.get('head')).toBe('langarsewa:dev');
        expect(url.searchParams.get('base')).toBe('main');
        expect(url.searchParams.get('state')).toBe('open');
        return opts.openPr ? [ghPull({ number: 42, sha: HEAD_SHA })] : [];
      },
    },
    {
      method: 'POST',
      url: /\/repos\/langarsewa\/website\/pulls$/,
      status: 201,
      reply: () => ghPull({ number: 43, sha: HEAD_SHA }),
    },
    { url: `/commits/${HEAD_SHA}/check-runs`, reply: () => ghCheckRuns(opts.checks) },
    {
      method: 'PUT',
      url: /\/pulls\/\d+\/merge$/,
      status: opts.mergeStatus ?? 200,
      reply: () =>
        (opts.mergeStatus ?? 200) === 200
          ? { sha: 'm'.repeat(40), merged: true, message: 'Pull Request successfully merged' }
          : { message: 'Pull Request is not mergeable' },
    },
  ];
}

function post(jwt: string) {
  return app.request(
    '/api/publish',
    { method: 'POST', headers: { 'Cf-Access-Jwt-Assertion': jwt } },
    makeEnv(appKey),
  );
}

function current(jwt: string) {
  return app.request(
    '/api/publish/current',
    { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
    makeEnv(appKey),
  );
}

describe('evaluateChecks', () => {
  it('is waiting with no runs, waiting while any run is open, failed on any failure, ready when all pass', () => {
    expect(evaluateChecks([])).toBe('waiting');
    expect(
      evaluateChecks([
        { name: 'build', status: 'completed', conclusion: 'success' },
        { name: 'lint', status: 'in_progress', conclusion: null },
      ]),
    ).toBe('waiting');
    expect(
      evaluateChecks([
        { name: 'build', status: 'completed', conclusion: 'failure' },
        { name: 'lint', status: 'in_progress', conclusion: null },
      ]),
    ).toBe('failed');
    expect(
      evaluateChecks([
        { name: 'build', status: 'completed', conclusion: 'success' },
        { name: 'docs', status: 'completed', conclusion: 'skipped' },
      ]),
    ).toBe('ready');
  });
});

describe('POST /api/publish', () => {
  it('opens the PR and reports waiting while checks run, without merging', async () => {
    const { calls } = stubFetch(
      publishRoutes({
        openPr: false,
        checks: [{ name: 'build', status: 'in_progress', conclusion: null }],
      }),
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const res = await post(ownerJwt);
    expect(res.status).toBe(200);
    const body = await readJson<PublishResponse>(res);
    expect(body).toEqual({
      pr: { number: 43, url: 'https://github.com/langarsewa/website/pull/43' },
      state: 'waiting',
      checks: [{ name: 'build', status: 'in_progress', conclusion: null }],
    });
    const created = calls.find((c) => c.method === 'POST' && /\/pulls$/.test(c.url));
    expect(created?.body).toContain('"title":"Publish to langarsewa.org"');
    expect(created?.body).toContain('"head":"dev"');
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    const audits = log.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, string>,
    );
    expect(audits).toContainEqual(
      expect.objectContaining({
        actor: OWNER,
        action: 'publish.open_pr',
        target: '43',
        result: 'created',
      }),
    );
    log.mockRestore();
  });

  it('reuses the open PR and merges with a merge commit once every check passed', async () => {
    const { calls } = stubFetch(
      publishRoutes({
        openPr: true,
        checks: [
          { name: 'build', status: 'completed', conclusion: 'success' },
          { name: 'Cloudflare Pages', status: 'completed', conclusion: 'success' },
        ],
      }),
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const res = await post(ownerJwt);
    expect(res.status).toBe(200);
    const body = await readJson<PublishResponse>(res);
    expect(body.state).toBe('merged');
    expect(body.pr).toEqual({ number: 42, url: 'https://github.com/langarsewa/website/pull/42' });
    expect(body.checks).toHaveLength(2);
    expect(calls.some((c) => c.method === 'POST' && /\/pulls$/.test(c.url))).toBe(false);
    const merge = calls.find((c) => c.method === 'PUT');
    expect(merge?.url).toMatch(/\/pulls\/42\/merge$/);
    expect(merge?.body).toContain('"merge_method":"merge"');
    const audits = log.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, string>,
    );
    expect(audits).toContainEqual(
      expect.objectContaining({ action: 'publish.merge', target: '42' }),
    );
    log.mockRestore();
  });

  it('reports failed and does not merge when a check failed', async () => {
    const { calls } = stubFetch(
      publishRoutes({
        openPr: true,
        checks: [
          { name: 'build', status: 'completed', conclusion: 'failure' },
          { name: 'lint', status: 'completed', conclusion: 'success' },
        ],
      }),
    );
    const body = await readJson<PublishResponse>(await post(ownerJwt));
    expect(body.state).toBe('failed');
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('answers 502 merge_failed when GitHub refuses the merge', async () => {
    stubFetch(
      publishRoutes({
        openPr: true,
        checks: [{ name: 'build', status: 'completed', conclusion: 'success' }],
        mergeStatus: 405,
      }),
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const res = await post(ownerJwt);
    expect(res.status).toBe(502);
    expect((await readJson<ApiError>(res)).error.code).toBe('upstream_error');
    log.mockRestore();
  });

  it('answers 409 nothing_to_publish when GitHub says dev has no new commits', async () => {
    stubFetch([
      ...baseRoutes(access),
      { method: 'GET', url: /\/pulls\?/, reply: () => [] },
      {
        method: 'POST',
        url: /\/pulls$/,
        status: 422,
        reply: () => ({
          message: 'Validation Failed',
          errors: [{ message: 'No commits between main and dev' }],
        }),
      },
    ]);
    const res = await post(ownerJwt);
    expect(res.status).toBe(409);
    expect((await readJson<ApiError>(res)).error.code).toBe('nothing_to_publish');
  });

  it('refuses editors with 403 before touching GitHub', async () => {
    const { calls } = stubFetch(baseRoutes(access));
    const res = await post(editorJwt);
    expect(res.status).toBe(403);
    expect((await readJson<ApiError>(res)).error.code).toBe('not_allowed');
    expect(calls.some((c) => c.url.includes('api.github.com'))).toBe(false);
  });
});

describe('GET /api/publish/current', () => {
  it('reports ready without merging when all checks pass', async () => {
    const { calls } = stubFetch(
      publishRoutes({
        openPr: true,
        checks: [{ name: 'build', status: 'completed', conclusion: 'success' }],
      }),
    );
    const body = await readJson<PublishResponse>(await current(editorJwt));
    expect(body.state).toBe('ready');
    expect(body.pr.number).toBe(42);
    expect(
      calls.some((c) => c.method === 'PUT' || (c.method === 'POST' && /\/pulls$/.test(c.url))),
    ).toBe(false);
  });

  it('reports idle when no publish PR is open', async () => {
    stubFetch(publishRoutes({ openPr: false, checks: [] }));
    const body = await readJson<PublishIdle>(await current(editorJwt));
    expect(body).toEqual({ pr: null, state: 'idle' });
  });
});
