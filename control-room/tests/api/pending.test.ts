import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import type { PendingResponse } from '../../functions/_lib/types';
import {
  OWNER,
  baseRoutes,
  ghCommit,
  makeAccess,
  makeAppKey,
  makeEnv,
  readJson,
  stubFetch,
  testPeople,
  type AccessFixture,
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

const S1 = '1'.repeat(40);
const S2 = '2'.repeat(40);
const MERGE = '3'.repeat(40);

describe('GET /api/pending', () => {
  it('lists ahead commits newest first, skips merges and attaches files per commit', async () => {
    const { calls } = stubFetch([
      ...baseRoutes(access),
      {
        url: /compare\/main\.\.\.dev/,
        reply: () => ({
          ahead_by: 3,
          behind_by: 0,
          html_url: 'https://github.com/langarsewa/website/compare/main...dev',
          commits: [
            ghCommit({
              sha: S1,
              message: 'Update hours\n\nTuesday closed',
              author: 'Harpreet Kaur',
              date: '2026-10-08T10:00:00Z',
            }),
            ghCommit({ sha: MERGE, message: "Merge branch 'main' into dev", parents: 2 }),
            ghCommit({
              sha: S2,
              message: 'Add photo',
              author: 'Gurdeep Singh',
              date: '2026-10-09T10:00:00Z',
            }),
          ],
        }),
      },
      {
        url: `/commits/${S1}`,
        reply: () => ghCommit({ sha: S1, files: ['src/content/home.json'] }),
      },
      {
        url: `/commits/${S2}`,
        reply: () =>
          ghCommit({ sha: S2, files: ['public/photos/langar.jpg', 'src/content/gallery.json'] }),
      },
    ]);

    const res = await app.request(
      '/api/pending',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(200);
    const body = await readJson<PendingResponse>(res);
    expect(body).toEqual({
      count: 2,
      compareUrl: 'https://github.com/langarsewa/website/compare/main...dev',
      changes: [
        {
          sha: S2,
          title: 'Add photo',
          author: 'Gurdeep Singh',
          at: '2026-10-09T10:00:00Z',
          files: ['public/photos/langar.jpg', 'src/content/gallery.json'],
        },
        {
          sha: S1,
          title: 'Update hours',
          author: 'Harpreet Kaur',
          at: '2026-10-08T10:00:00Z',
          files: ['src/content/home.json'],
        },
      ],
    });
    // The merge commit is never looked up.
    expect(calls.some((c) => c.url.includes(`/commits/${MERGE}`))).toBe(false);
    // The installation token is minted once and reused across the calls.
    expect(calls.filter((c) => c.url.endsWith('/access_tokens'))).toHaveLength(1);
    const authed = calls.find((c) => c.url.includes('/compare/'));
    expect(authed).toBeDefined();
  });

  it('answers an empty list when dev and main are level', async () => {
    stubFetch([
      ...baseRoutes(access),
      {
        url: /compare\/main\.\.\.dev/,
        reply: () => ({ ahead_by: 0, behind_by: 0, html_url: '', commits: [] }),
      },
    ]);
    const res = await app.request(
      '/api/pending',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    const body = await readJson<PendingResponse>(res);
    expect(body.count).toBe(0);
    expect(body.changes).toEqual([]);
    expect(body.compareUrl).toBe('https://github.com/langarsewa/website/compare/main...dev');
  });
});
