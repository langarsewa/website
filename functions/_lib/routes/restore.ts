import { audit } from '../audit';
import { isSuccessful, type CloudflareClient } from '../cloudflare';
import type { Actor, Bindings } from '../env';
import { HttpError } from '../errors';
import type { RestoreResponse } from '../types';

/** Cloudflare ids are UUIDs; accept any short URL-safe token and let Cloudflare answer 404 for the rest. */
const DEPLOYMENT_ID = /^[A-Za-z0-9-]{4,64}$/;

export function parseRestoreBody(raw: unknown): { deploymentId: string } {
  if (typeof raw === 'object' && raw !== null && 'deploymentId' in raw) {
    const id = (raw as { deploymentId: unknown }).deploymentId;
    if (typeof id === 'string' && DEPLOYMENT_ID.test(id)) return { deploymentId: id };
  }
  throw new HttpError(
    400,
    'bad_request',
    'Body must be {"deploymentId": "<cloudflare deployment id>"}',
  );
}

/**
 * Phase 1: Cloudflare rollback only. The matching revert commit on main is a TODO (see docs/api.md),
 * so until then the next publish will re-deploy whatever main holds.
 */
export async function runRestore(
  env: Bindings,
  cf: CloudflareClient,
  actor: Actor,
  deploymentId: string,
): Promise<RestoreResponse> {
  const project = env.SITE_PAGES_PROJECT;
  const [projectInfo, deployment] = await Promise.all([
    cf.getProject(project).catch(() => null),
    cf.getDeployment(project, deploymentId),
  ]);

  if (deployment.environment !== 'production') {
    throw new HttpError(409, 'not_production', 'Only production deployments can be restored');
  }
  if (!isSuccessful(deployment)) {
    throw new HttpError(409, 'not_restorable', 'That deployment did not finish successfully');
  }

  let currentId = projectInfo?.canonical_deployment?.id ?? null;
  if (!currentId) {
    const production = await cf.listDeployments(project, 'production');
    currentId =
      [...production]
        .sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on))
        .find(isSuccessful)?.id ?? null;
  }
  if (currentId === deploymentId) {
    throw new HttpError(409, 'already_current', 'That deployment is already live');
  }

  try {
    await cf.rollback(project, deploymentId);
  } catch (err) {
    audit(actor, 'restore.rollback', deploymentId, 'error');
    throw err;
  }
  audit(actor, 'restore.rollback', deploymentId, 'ok');
  return { ok: true, deploymentId };
}
