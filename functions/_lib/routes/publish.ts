import { audit } from '../audit';
import type { Actor } from '../env';
import { HttpError, UpstreamError } from '../errors';
import type { CheckRun, GitHubClient, PullRequest } from '../github';
import type { PublishIdle, PublishResponse, PublishState } from '../types';

export const PUBLISH_TITLE = 'Publish to langarsewa.org';
export const HEAD = 'dev';
export const BASE = 'main';

const PASSING = new Set(['success', 'neutral', 'skipped']);
const FAILING = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure',
  'stale',
]);

/**
 * No check runs yet counts as waiting: CI reports against the head commit within a minute of a push,
 * and merging before it reports would skip the gate.
 */
export function evaluateChecks(checks: CheckRun[]): Exclude<PublishState, 'merged'> {
  if (checks.length === 0) return 'waiting';
  if (
    checks.some(
      (c) => c.status === 'completed' && c.conclusion !== null && FAILING.has(c.conclusion),
    )
  ) {
    return 'failed';
  }
  if (
    checks.every(
      (c) => c.status === 'completed' && c.conclusion !== null && PASSING.has(c.conclusion),
    )
  ) {
    return 'ready';
  }
  return 'waiting';
}

function respond(pr: PullRequest, state: PublishState, checks: CheckRun[]): PublishResponse {
  return { pr: { number: pr.number, url: pr.url }, state, checks };
}

/** Read-only view for GET /api/publish/current. */
export async function currentPublish(gh: GitHubClient): Promise<PublishResponse | PublishIdle> {
  const pr = await gh.findOpenPullRequest(HEAD, BASE);
  if (!pr) return { pr: null, state: 'idle' };
  const checks = await gh.listCheckRunsForRef(pr.headSha);
  return respond(pr, evaluateChecks(checks), checks);
}

/** POST /api/publish: find or open the PR, read its checks, merge when they all pass. Safe to call repeatedly. */
export async function runPublish(gh: GitHubClient, actor: Actor): Promise<PublishResponse> {
  const body = [
    `Opened from Sewa Control Room by ${actor.email} on ${new Date().toISOString()}.`,
    '',
    'Merging this pull request publishes the current test site to production.',
  ].join('\n');

  let found: { pr: PullRequest; created: boolean };
  try {
    found = await gh.findOrCreatePullRequest(HEAD, BASE, PUBLISH_TITLE, body);
  } catch (err) {
    // GitHub answers 422 when dev has nothing main lacks.
    if (err instanceof UpstreamError && err.upstreamStatus === 422) {
      throw new HttpError(
        409,
        'nothing_to_publish',
        'The test site has no changes that are not already live',
      );
    }
    throw err;
  }
  const { pr, created } = found;
  if (created) audit(actor, 'publish.open_pr', `${pr.number}`, 'created');

  const checks = await gh.listCheckRunsForRef(pr.headSha);
  const state = evaluateChecks(checks);
  if (state !== 'ready') return respond(pr, state, checks);

  try {
    const merged = await gh.mergePullRequest(
      pr.number,
      'merge',
      `${PUBLISH_TITLE} (#${pr.number})`,
    );
    audit(
      actor,
      'publish.merge',
      `${pr.number}`,
      merged.merged ? `merged ${merged.sha}` : 'not merged',
    );
    if (!merged.merged)
      throw new HttpError(502, 'merge_failed', 'GitHub did not merge the pull request');
  } catch (err) {
    if (err instanceof HttpError && err.code === 'merge_failed') throw err;
    audit(actor, 'publish.merge', `${pr.number}`, 'error');
    throw err;
  }
  return respond(pr, 'merged', checks);
}
