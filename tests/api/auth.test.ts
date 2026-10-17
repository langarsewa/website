import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { roleFor } from '../../functions/_lib/people';
import type { ApiError } from '../../functions/_lib/errors';
import type { MeResponse } from '../../functions/_lib/types';
import {
  AUDIENCE,
  EDITOR,
  OWNER,
  STRANGER,
  TEAM_DOMAIN,
  baseRoutes,
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
const app = createApp({ people: testPeople });

beforeAll(async () => {
  [access, appKey] = await Promise.all([makeAccess(), makeAppKey()]);
});

beforeEach(() => {
  stubFetch(baseRoutes(access));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('roleFor', () => {
  it('maps owners and editors case-insensitively and rejects unknown emails', () => {
    expect(roleFor('INFO@LangarSewa.org', testPeople)).toBe('owner');
    expect(roleFor(' editor@example.org ', testPeople)).toBe('editor');
    expect(roleFor(STRANGER, testPeople)).toBeNull();
    expect(roleFor('', testPeople)).toBeNull();
  });

  it('reads config/people.json by default', () => {
    expect(roleFor('info@langarsewa.org')).toBe('owner');
  });
});

describe('GET /api/me', () => {
  it('answers 401 without an Access token and sets Cache-Control: no-store', async () => {
    const res = await app.request('/api/me', {}, makeEnv(appKey));
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await readJson<ApiError>(res);
    expect(body.error.code).toBe('unauthorized');
  });

  it('verifies the header JWT and maps the owner', async () => {
    const jwt = await access.sign(OWNER.toUpperCase());
    const res = await app.request(
      '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await readJson<MeResponse>(res)).toEqual({ email: OWNER, role: 'owner' });
  });

  it('falls back to the CF_Authorization cookie and maps editors', async () => {
    const jwt = await access.sign(EDITOR);
    const res = await app.request(
      '/api/me',
      { headers: { cookie: `CF_Authorization=${jwt}` } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(200);
    expect(await readJson<MeResponse>(res)).toEqual({ email: EDITOR, role: 'editor' });
  });

  it('rejects a token signed by a key outside the team JWKS', async () => {
    const jwt = await access.sign(OWNER, { key: access.rogueKey });
    const res = await app.request(
      '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(401);
  });

  it('rejects a token for a different audience', async () => {
    const jwt = await access.sign(OWNER, { audience: `${AUDIENCE}-other` });
    const res = await app.request(
      '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(401);
  });

  it('answers 403 not_allowed for a verified email that is not listed', async () => {
    const jwt = await access.sign(STRANGER);
    const res = await app.request(
      '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(403);
    expect((await readJson<ApiError>(res)).error.code).toBe('not_allowed');
  });

  it('honours DEV_BYPASS_EMAIL only when no team domain is configured', async () => {
    const local = makeEnv(appKey, {
      ACCESS_TEAM_DOMAIN: '',
      ACCESS_AUD: '',
      DEV_BYPASS_EMAIL: EDITOR,
    });
    const res = await app.request('/api/me', {}, local);
    expect(res.status).toBe(200);
    expect(await readJson<MeResponse>(res)).toEqual({ email: EDITOR, role: 'editor' });
  });

  it('refuses the bypass when ACCESS_TEAM_DOMAIN is set', async () => {
    const prod = makeEnv(appKey, { ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, DEV_BYPASS_EMAIL: OWNER });
    const res = await app.request('/api/me', {}, prod);
    expect(res.status).toBe(401);
  });
});

describe('unknown routes', () => {
  it('answers 404 not_found under /api for a signed-in caller', async () => {
    const jwt = await access.sign(OWNER);
    const res = await app.request(
      '/api/nope',
      { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
      makeEnv(appKey),
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await readJson<ApiError>(res)).error.code).toBe('not_found');
  });
});
