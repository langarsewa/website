import { createAppAuth } from '@octokit/auth-app';
import { request } from '@octokit/request';
import type { Bindings } from './env';
import { UpstreamError } from './errors';

const API_VERSION = '2022-11-28';
const USER_AGENT = 'sewa-control-room';
/** Mint a fresh installation token once the cached one is within 5 minutes of expiry. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type CachedToken = { key: string; token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

/** Test hook. */
export function resetGitHubTokenCache(): void {
  cachedToken = null;
}

export async function getInstallationToken(env: Bindings): Promise<string> {
  const key = `${env.GITHUB_APP_ID}:${env.GITHUB_APP_INSTALLATION_ID}`;
  if (
    cachedToken &&
    cachedToken.key === key &&
    cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()
  ) {
    return cachedToken.token;
  }
  const auth = createAppAuth({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
  });
  try {
    const { token, expiresAt } = await auth({ type: 'installation' });
    cachedToken = { key, token, expiresAt: Date.parse(expiresAt) };
    return token;
  } catch (err) {
    throw UpstreamError.from('github', err);
  }
}

export type CommitSummary = {
  sha: string;
  /** First line of the commit message. */
  title: string;
  author: string;
  at: string;
  isMerge: boolean;
};

export type CommitDetail = CommitSummary & { files: string[] };

export type Comparison = { aheadBy: number; url: string; commits: CommitSummary[] };

export type WorkflowRun = {
  name: string;
  branch: string | null;
  status: string | null;
  conclusion: string | null;
  url: string;
  at: string;
};

export type CheckRun = { name: string; status: string; conclusion: string | null };

export type PullRequest = { number: number; url: string; headSha: string; state: string };

export interface GitHubClient {
  compareBranches(base: string, head: string): Promise<Comparison>;
  listWorkflowRuns(branch?: string): Promise<WorkflowRun[]>;
  listCheckRunsForRef(ref: string): Promise<CheckRun[]>;
  findOpenPullRequest(head: string, base: string): Promise<PullRequest | null>;
  findOrCreatePullRequest(
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<{ pr: PullRequest; created: boolean }>;
  mergePullRequest(
    number: number,
    method?: 'merge',
    commitTitle?: string,
  ): Promise<{ sha: string; merged: boolean }>;
  getCommit(sha: string): Promise<CommitDetail>;
  listCommits(branch: string, perPage?: number): Promise<CommitSummary[]>;
}

/** Structural view of the GitHub commit object; octokit's typed responses satisfy it. */
type RawCommit = {
  sha: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string } | null;
    committer?: { name?: string; date?: string } | null;
  };
  author?: { login?: string } | null;
  parents: { sha: string }[];
  files?: { filename: string }[];
};

export function firstLine(message: string | null | undefined): string {
  return (message ?? '').split('\n')[0]?.trim() ?? '';
}

function toCommitSummary(raw: RawCommit): CommitSummary {
  return {
    sha: raw.sha,
    title: firstLine(raw.commit.message),
    author: raw.commit.author?.name ?? raw.author?.login ?? 'unknown',
    at: raw.commit.author?.date ?? raw.commit.committer?.date ?? '',
    isMerge: raw.parents.length > 1,
  };
}

function parseRepo(full: string): { owner: string; repo: string } {
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error(`SITE_REPO must be "owner/repo", got "${full}"`);
  return { owner, repo };
}

export function createGitHubClient(env: Bindings): GitHubClient {
  const repoRef = parseRepo(env.SITE_REPO);

  async function headers(): Promise<Record<string, string>> {
    const token = await getInstallationToken(env);
    return {
      authorization: `token ${token}`,
      'x-github-api-version': API_VERSION,
      'user-agent': USER_AGENT,
    };
  }

  async function guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw UpstreamError.from('github', err);
    }
  }

  const client: GitHubClient = {
    async compareBranches(base, head) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/compare/{basehead}', {
          ...repoRef,
          basehead: `${base}...${head}`,
          per_page: 250,
          headers: h,
        }),
      );
      return {
        aheadBy: data.ahead_by,
        url: data.html_url,
        commits: data.commits.map(toCommitSummary),
      };
    },

    async listWorkflowRuns(branch) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/actions/runs', {
          ...repoRef,
          branch,
          per_page: 30,
          exclude_pull_requests: true,
          headers: h,
        }),
      );
      return data.workflow_runs.map((run) => ({
        name: run.name ?? '',
        branch: run.head_branch ?? null,
        status: run.status ?? null,
        conclusion: run.conclusion ?? null,
        url: run.html_url,
        at: run.updated_at ?? run.created_at,
      }));
    },

    async listCheckRunsForRef(ref) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
          ...repoRef,
          ref,
          per_page: 100,
          headers: h,
        }),
      );
      return data.check_runs.map((run) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion ?? null,
      }));
    },

    async findOpenPullRequest(head, base) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/pulls', {
          ...repoRef,
          state: 'open',
          head: `${repoRef.owner}:${head}`,
          base,
          per_page: 1,
          headers: h,
        }),
      );
      const pr = data[0];
      return pr
        ? { number: pr.number, url: pr.html_url, headSha: pr.head.sha, state: pr.state }
        : null;
    },

    async findOrCreatePullRequest(head, base, title, body) {
      const existing = await client.findOpenPullRequest(head, base);
      if (existing) return { pr: existing, created: false };
      const h = await headers();
      const { data } = await guard(() =>
        request('POST /repos/{owner}/{repo}/pulls', {
          ...repoRef,
          title,
          head,
          base,
          body,
          headers: h,
        }),
      );
      return {
        pr: { number: data.number, url: data.html_url, headSha: data.head.sha, state: data.state },
        created: true,
      };
    },

    async mergePullRequest(number, method = 'merge', commitTitle) {
      const h = await headers();
      const { data } = await guard(() =>
        request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
          ...repoRef,
          pull_number: number,
          merge_method: method,
          commit_title: commitTitle,
          headers: h,
        }),
      );
      return { sha: data.sha, merged: data.merged };
    },

    async getCommit(sha) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/commits/{ref}', { ...repoRef, ref: sha, headers: h }),
      );
      return { ...toCommitSummary(data), files: (data.files ?? []).map((f) => f.filename) };
    },

    async listCommits(branch, perPage = 50) {
      const h = await headers();
      const { data } = await guard(() =>
        request('GET /repos/{owner}/{repo}/commits', {
          ...repoRef,
          sha: branch,
          per_page: perPage,
          headers: h,
        }),
      );
      return data.map(toCommitSummary);
    },
  };

  return client;
}
