import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireIdentity, requireOwner } from './auth';
import { createCloudflareClient } from './cloudflare';
import type { AppEnv } from './env';
import { HttpError, type ApiError, type ErrorStatus } from './errors';
import { createGitHubClient } from './github';
import type { People } from './people';
import { buildHistory } from './routes/history';
import { buildPending } from './routes/pending';
import { currentPublish, runPublish } from './routes/publish';
import { parseRestoreBody, runRestore } from './routes/restore';
import { buildStatus } from './routes/status';
import type { MeResponse } from './types';

export type AppOptions = {
  /** Overrides config/people.json; used by tests. */
  people?: People;
};

function errorBody(code: string, message: string): ApiError {
  return { error: { code, message } };
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();

  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    await next();
  });

  const api = new Hono<AppEnv>();
  api.use('*', requireIdentity(options.people));

  api.get('/me', (c) => {
    const actor = c.get('actor');
    const body: MeResponse = { email: actor.email, role: actor.role };
    return c.json(body);
  });

  api.get('/status', async (c) =>
    c.json(await buildStatus(c.env, createGitHubClient(c.env), createCloudflareClient(c.env))),
  );

  api.get('/pending', async (c) => c.json(await buildPending(c.env, createGitHubClient(c.env))));

  api.get('/publish/current', async (c) => c.json(await currentPublish(createGitHubClient(c.env))));

  api.post('/publish', requireOwner, async (c) =>
    c.json(await runPublish(createGitHubClient(c.env), c.get('actor'))),
  );

  api.get('/history', async (c) =>
    c.json(await buildHistory(c.env, createGitHubClient(c.env), createCloudflareClient(c.env))),
  );

  api.post('/restore', requireOwner, async (c) => {
    const raw: unknown = await c.req.json().catch(() => null);
    const { deploymentId } = parseRestoreBody(raw);
    return c.json(
      await runRestore(c.env, createCloudflareClient(c.env), c.get('actor'), deploymentId),
    );
  });

  app.route('/api', api);

  app.notFound((c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(errorBody('not_found', `No route for ${c.req.method} ${c.req.path}`), 404);
  });

  app.onError((err, c) => {
    c.header('Cache-Control', 'no-store');
    if (err instanceof HttpError) return c.json(err.toBody(), err.status);
    if (err instanceof HTTPException) {
      const status = (err.status === 400 || err.status === 404 ? err.status : 500) as ErrorStatus;
      return c.json(errorBody(status === 500 ? 'internal' : 'bad_request', err.message), status);
    }
    console.error(
      JSON.stringify({ kind: 'error', path: c.req.path, message: err.message, stack: err.stack }),
    );
    return c.json(errorBody('internal', 'Unexpected error'), 500);
  });

  return app;
}

export const app = createApp();
