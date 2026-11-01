import { isSuccessful, type CfDeployment, type CloudflareClient } from '../cloudflare';
import type { Bindings } from '../env';
import { firstLine, type GitHubClient, type WorkflowRun } from '../github';
import type { CiSummary, DeploymentSummary, StatusResponse } from '../types';

export const CI_WORKFLOW = 'CI';
export const CHECK_WORKFLOW = 'Production check';
export const TEST_BRANCH = 'dev';

function newestFirst(deployments: CfDeployment[]): CfDeployment[] {
  return [...deployments].sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on));
}

/** What is live: the project's canonical deployment when it is in the list, else the newest successful one. */
export function pickProduction(
  deployments: CfDeployment[],
  canonicalId: string | null | undefined,
): CfDeployment | null {
  const production = newestFirst(deployments.filter((d) => d.environment === 'production'));
  if (canonicalId) {
    const canonical = production.find((d) => d.id === canonicalId);
    if (canonical) return canonical;
  }
  return production.find(isSuccessful) ?? null;
}

export function pickTest(deployments: CfDeployment[]): CfDeployment | null {
  return (
    newestFirst(deployments).find(
      (d) => isSuccessful(d) && d.deployment_trigger?.metadata?.branch === TEST_BRANCH,
    ) ?? null
  );
}

async function summarise(
  deployment: CfDeployment | null,
  publicUrl: string,
  gh: GitHubClient,
): Promise<DeploymentSummary> {
  const commit = deployment?.deployment_trigger?.metadata?.commit_hash ?? null;
  const by = commit
    ? await gh
        .getCommit(commit)
        .then((c) => c.author)
        .catch(() => null)
    : null;
  return {
    url: publicUrl,
    deploymentId: deployment?.id ?? null,
    commit,
    message: deployment
      ? firstLine(deployment.deployment_trigger?.metadata?.commit_message) || null
      : null,
    at: deployment?.created_on ?? null,
    by,
  };
}

function ciSummary(runs: WorkflowRun[], branch: string): CiSummary {
  const run =
    runs.find((r) => r.name === CI_WORKFLOW && r.branch === branch) ??
    runs.find((r) => r.name === CI_WORKFLOW);
  return run
    ? { status: run.status, conclusion: run.conclusion, url: run.url, at: run.at }
    : { status: null, conclusion: null, url: null, at: null };
}

export async function buildStatus(
  env: Bindings,
  gh: GitHubClient,
  cf: CloudflareClient,
): Promise<StatusResponse> {
  const project = env.SITE_PAGES_PROJECT;
  const [productionDeployments, previewDeployments, projectInfo, mainRuns, devRuns, allRuns] =
    await Promise.all([
      cf.listDeployments(project, 'production'),
      cf.listDeployments(project, 'preview'),
      cf.getProject(project).catch(() => null),
      gh.listWorkflowRuns('main'),
      gh.listWorkflowRuns(TEST_BRANCH),
      gh.listWorkflowRuns(),
    ]);

  const [production, test] = await Promise.all([
    summarise(
      pickProduction(productionDeployments, projectInfo?.canonical_deployment?.id),
      env.SITE_PRODUCTION_URL,
      gh,
    ),
    summarise(pickTest(previewDeployments), env.SITE_TEST_URL, gh),
  ]);

  // Only a finished run says anything about production; a running check keeps the previous verdict out of view.
  const check = allRuns.find((r) => r.name === CHECK_WORKFLOW && r.status === 'completed') ?? null;

  return {
    production,
    test,
    ci: { main: ciSummary(mainRuns, 'main'), dev: ciSummary(devRuns, TEST_BRANCH) },
    check: { ok: check?.conclusion === 'success', at: check?.at ?? null, url: check?.url ?? null },
  };
}
