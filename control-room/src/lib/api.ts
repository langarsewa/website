/**
 * Typed fetch wrapper over /api, with a mock mode for development and tests.
 *
 * Mock mode is on when `import.meta.env.PUBLIC_MOCK === '1'` or the page URL carries `mock=1`.
 * A `mock=1` visit sticks for the browser session (sessionStorage) so links keep working;
 * `mock=0` turns it off. `scene=<name>` picks a fixture scene (see fixtures.ts).
 */
import * as fixtures from './fixtures';
import type { Scene } from './fixtures';
import type {
  ApiErrorBody,
  History,
  Me,
  Pending,
  Publish,
  PublishCurrent,
  RestoreResult,
  Status,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/* ------------------------------------------------------------------ shape guards */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';

export function isApiErrorBody(v: unknown): v is ApiErrorBody {
  return isObj(v) && isObj(v.error) && isStr(v.error.code) && isStr(v.error.message);
}

export function isMe(v: unknown): v is Me {
  return isObj(v) && isStr(v.email) && (v.role === 'owner' || v.role === 'editor');
}

function isDeployment(v: unknown): boolean {
  return isObj(v) && isStr(v.url) && isStr(v.deploymentId) && isStr(v.at);
}

function isCiRun(v: unknown): boolean {
  return isObj(v) && 'status' in v && 'conclusion' in v;
}

export function isStatus(v: unknown): v is Status {
  return (
    isObj(v) &&
    isDeployment(v.production) &&
    isDeployment(v.test) &&
    isObj(v.ci) &&
    isCiRun(v.ci.main) &&
    isCiRun(v.ci.dev) &&
    isObj(v.check) &&
    typeof v.check.ok === 'boolean' &&
    isStrOrNull(v.check.at ?? null)
  );
}

export function isPending(v: unknown): v is Pending {
  return (
    isObj(v) &&
    typeof v.count === 'number' &&
    Array.isArray(v.changes) &&
    v.changes.every((c) => isObj(c) && isStr(c.sha) && isStr(c.title) && Array.isArray(c.files))
  );
}

export function isPublishCurrent(v: unknown): v is PublishCurrent {
  if (!isObj(v)) return false;
  if (v.pr === null) return v.state === 'idle';
  return (
    isObj(v.pr) &&
    typeof v.pr.number === 'number' &&
    isStr(v.pr.url) &&
    ['waiting', 'ready', 'merged', 'failed'].includes(String(v.state)) &&
    Array.isArray(v.checks)
  );
}

export function isPublish(v: unknown): v is Publish {
  return isPublishCurrent(v) && v.pr !== null;
}

export function isHistory(v: unknown): v is History {
  return (
    isObj(v) &&
    Array.isArray(v.deployments) &&
    v.deployments.every(
      (d) => isObj(d) && isStr(d.id) && isStr(d.at) && typeof d.isCurrent === 'boolean',
    )
  );
}

export function isRestoreResult(v: unknown): v is RestoreResult {
  return isObj(v) && v.ok === true && isStr(v.deploymentId);
}

/* ------------------------------------------------------------------ mock switch */

const MOCK_KEY = 'controlroom.mock';
const SCENE_KEY = 'controlroom.scene';
const PUBLISH_KEY = 'controlroom.mockPublishStartedAt';

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function search(): URLSearchParams | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

/** Decides mock mode from env, the URL and the sticky session flag. Exported for tests. */
export function resolveMock(opts: {
  env?: string | undefined;
  search?: URLSearchParams | null;
  store?: Storage | null;
}): { mock: boolean; scene: Scene } {
  const params = opts.search ?? null;
  const store = opts.store ?? null;
  let mock = opts.env === '1';
  const q = params?.get('mock');
  if (q === '1') {
    mock = true;
    store?.setItem(MOCK_KEY, '1');
  } else if (q === '0') {
    store?.removeItem(MOCK_KEY);
    store?.removeItem(SCENE_KEY);
  } else if (store?.getItem(MOCK_KEY) === '1') {
    mock = true;
  }
  const requested = params?.get('scene');
  let scene: Scene = 'healthy';
  if (requested && (fixtures.SCENES as readonly string[]).includes(requested)) {
    scene = requested as Scene;
    store?.setItem(SCENE_KEY, scene);
  } else {
    const stored = store?.getItem(SCENE_KEY);
    if (stored && (fixtures.SCENES as readonly string[]).includes(stored)) scene = stored as Scene;
  }
  return { mock, scene };
}

export function isMockMode(): boolean {
  return resolveMock({ env: import.meta.env.PUBLIC_MOCK, search: search(), store: storage() }).mock;
}

export function mockScene(): Scene {
  return resolveMock({ env: import.meta.env.PUBLIC_MOCK, search: search(), store: storage() })
    .scene;
}

/* ------------------------------------------------------------------ transport */

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  guard: (v: unknown) => v is T,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the control room.');
  }
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    if (isApiErrorBody(data)) throw new ApiError(res.status, data.error.code, data.error.message);
    throw new ApiError(
      res.status,
      `http_${res.status}`,
      `The control room answered ${res.status}.`,
    );
  }
  if (!guard(data)) {
    throw new ApiError(0, 'bad_shape', `Unexpected answer from ${path}.`);
  }
  return data;
}

/* ------------------------------------------------------------------ mock transport */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const scene = mockScene();
  await sleep(350);
  if (scene === 'offline') throw new ApiError(0, 'network', 'Could not reach the control room.');
  if (scene === 'forbidden') {
    throw new ApiError(403, 'not_on_list', 'guest@example.com is not on the list of people.');
  }
  const store = storage();
  const now = new Date();
  const asT = (v: unknown) => v as T;

  if (path === '/api/me') return asT(fixtures.me(scene));
  if (path === '/api/status') return asT(fixtures.status(scene, now));
  if (path === '/api/pending') return asT(fixtures.pending(scene, now));
  if (path === '/api/history') return asT(fixtures.history(scene, now));
  if (path === '/api/publish' && method === 'POST') {
    if (fixtures.me(scene).role !== 'owner') {
      throw new ApiError(403, 'owner_only', 'Only an owner can publish.');
    }
    const started = Date.now();
    store?.setItem(PUBLISH_KEY, String(started));
    return asT(fixtures.publishAfter(started, scene, now));
  }
  if (path === '/api/publish/current') {
    const raw = store?.getItem(PUBLISH_KEY);
    const started = raw ? Number(raw) : NaN;
    if (!Number.isFinite(started)) return asT({ pr: null, state: 'idle' } satisfies PublishCurrent);
    return asT(fixtures.publishAfter(started, scene, now));
  }
  if (path === '/api/restore' && method === 'POST') {
    if (fixtures.me(scene).role !== 'owner') {
      throw new ApiError(403, 'owner_only', 'Only an owner can restore.');
    }
    const id = isObj(body) && isStr(body.deploymentId) ? body.deploymentId : '';
    if (!id) throw new ApiError(404, 'not_found', 'That version was not found.');
    return asT({ ok: true, deploymentId: id } satisfies RestoreResult);
  }
  throw new ApiError(404, 'not_found', `No mock for ${method} ${path}.`);
}

/* ------------------------------------------------------------------ public API */

function call<T>(
  method: 'GET' | 'POST',
  path: string,
  guard: (v: unknown) => v is T,
  body?: unknown,
): Promise<T> {
  return isMockMode() ? mockRequest<T>(path, method, body) : request(method, path, guard, body);
}

export const api = {
  me: () => call('GET', '/api/me', isMe),
  status: () => call('GET', '/api/status', isStatus),
  pending: () => call('GET', '/api/pending', isPending),
  publish: () => call('POST', '/api/publish', isPublish, {}),
  publishCurrent: () => call('GET', '/api/publish/current', isPublishCurrent),
  history: () => call('GET', '/api/history', isHistory),
  restore: (deploymentId: string) =>
    call('POST', '/api/restore', isRestoreResult, { deploymentId }),
};

export type Api = typeof api;

/**
 * Best effort: who is signed in, for the 403 screen when /api/me itself refused us. Cloudflare
 * Access exposes the identity at this same-origin path; anything else returns null.
 */
export async function accessIdentityEmail(): Promise<string | null> {
  if (isMockMode()) return null;
  try {
    const res = await fetch('/cdn-cgi/access/get-identity', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isObj(data) && isStr(data.email) ? data.email : null;
  } catch {
    return null;
  }
}

/** Pulls an email address out of an error message, if the API put one there. */
export function emailIn(text: string | null | undefined): string | null {
  const m = (text ?? '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  return m ? m[0] : null;
}
