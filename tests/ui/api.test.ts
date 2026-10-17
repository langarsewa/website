import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  api,
  emailIn,
  isApiErrorBody,
  isHistory,
  isMe,
  isPending,
  isPublishCurrent,
  isStatus,
  resolveMock,
} from '../../src/lib/api';
import * as fixtures from '../../src/lib/fixtures';

const now = new Date(2026, 9, 17, 10, 12, 0);

describe('shape guards', () => {
  it('accept the fixtures (which follow the agreed API shapes)', () => {
    expect(isMe(fixtures.me('healthy'))).toBe(true);
    expect(isStatus(fixtures.status('healthy', now))).toBe(true);
    expect(isPending(fixtures.pending('healthy', now))).toBe(true);
    expect(isHistory(fixtures.history('healthy', now))).toBe(true);
    expect(isPublishCurrent(fixtures.publishAfter(now.getTime(), 'healthy', now))).toBe(true);
    expect(isPublishCurrent({ pr: null, state: 'idle' })).toBe(true);
  });

  it('reject wrong roles, missing fields and malformed publish states', () => {
    expect(isMe({ email: 'x@y.org', role: 'admin' })).toBe(false);
    expect(isStatus({ production: {}, test: {}, ci: {}, check: {} })).toBe(false);
    expect(isPending({ count: '2', changes: [] })).toBe(false);
    expect(isPublishCurrent({ pr: null, state: 'waiting' })).toBe(false);
    expect(isPublishCurrent({ pr: { number: 1, url: 'u' }, state: 'done', checks: [] })).toBe(
      false,
    );
    expect(isApiErrorBody({ error: { code: 'x', message: 'y' } })).toBe(true);
    expect(isApiErrorBody({ message: 'y' })).toBe(false);
  });
});

describe('resolveMock', () => {
  function memoryStorage(): Storage {
    const m = new Map<string, string>();
    return {
      get length() {
        return m.size;
      },
      clear: () => m.clear(),
      getItem: (k) => m.get(k) ?? null,
      key: (i) => Array.from(m.keys())[i] ?? null,
      removeItem: (k) => void m.delete(k),
      setItem: (k, v) => void m.set(k, v),
    };
  }

  it('turns on from the env flag or ?mock=1 and sticks for the session', () => {
    expect(resolveMock({ env: '1' }).mock).toBe(true);
    expect(resolveMock({ env: undefined }).mock).toBe(false);
    const store = memoryStorage();
    expect(resolveMock({ search: new URLSearchParams('mock=1&scene=problem'), store })).toEqual({
      mock: true,
      scene: 'problem',
    });
    // Next navigation without the query string keeps mock and scene.
    expect(resolveMock({ search: new URLSearchParams(''), store })).toEqual({
      mock: true,
      scene: 'problem',
    });
    // mock=0 clears both.
    expect(resolveMock({ search: new URLSearchParams('mock=0'), store }).mock).toBe(false);
    expect(resolveMock({ search: new URLSearchParams(''), store }).scene).toBe('healthy');
  });

  it('ignores unknown scenes', () => {
    expect(resolveMock({ search: new URLSearchParams('mock=1&scene=nope') }).scene).toBe('healthy');
  });
});

describe('request errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('turns an API error body into ApiError with status and code', async () => {
    vi.stubEnv('PUBLIC_MOCK', '0');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'not_on_list', message: 'a@b.org is not on the list' },
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      ),
    );
    const err = await api.me().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(403);
    expect(apiErr.code).toBe('not_on_list');
    expect(apiErr.isForbidden).toBe(true);
    expect(emailIn(apiErr.message)).toBe('a@b.org');
  });

  it('turns a network failure into a status-0 ApiError and rejects wrong shapes', async () => {
    vi.stubEnv('PUBLIC_MOCK', '0');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const err = (await api.status().catch((e: unknown) => e)) as ApiError;
    expect(err.isNetwork).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ hello: 'world' }), { status: 200 })),
    );
    const bad = (await api.status().catch((e: unknown) => e)) as ApiError;
    expect(bad.code).toBe('bad_shape');
  });
});
