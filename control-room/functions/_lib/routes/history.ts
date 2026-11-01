import { isSuccessful, type CloudflareClient } from '../cloudflare';
import type { Bindings } from '../env';
import { firstLine, type GitHubClient } from '../github';
import type { HistoryResponse } from '../types';

export const HISTORY_LIMIT = 20;

export async function buildHistory(
  env: Bindings,
  gh: GitHubClient,
  cf: CloudflareClient,
): Promise<HistoryResponse> {
  const project = env.SITE_PAGES_PROJECT;
  const [deployments, projectInfo, commits] = await Promise.all([
    cf.listDeployments(project, 'production'),
    cf.getProject(project).catch(() => null),
    gh.listCommits('main', 100).catch(() => []),
  ]);
  const authors = new Map(commits.map((c) => [c.sha, c.author]));

  const production = deployments
    .filter((d) => d.environment === 'production')
    .sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on));
  const currentId =
    projectInfo?.canonical_deployment?.id ?? production.find(isSuccessful)?.id ?? null;

  return {
    deployments: production.slice(0, HISTORY_LIMIT).map((d) => {
      const commit = d.deployment_trigger?.metadata?.commit_hash ?? null;
      return {
        id: d.id,
        url: d.url,
        at: d.created_on,
        commit,
        message: firstLine(d.deployment_trigger?.metadata?.commit_message) || null,
        by: (commit && authors.get(commit)) ?? null,
        environment: 'production',
        isCurrent: d.id === currentId,
      };
    }),
  };
}
