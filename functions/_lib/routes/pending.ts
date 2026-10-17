import type { Bindings } from '../env';
import type { GitHubClient } from '../github';
import type { PendingResponse } from '../types';

/** Per-commit file lists cost one call each; beyond this many, newer commits keep their files and older ones get []. */
const MAX_DETAILED = 25;

export async function buildPending(env: Bindings, gh: GitHubClient): Promise<PendingResponse> {
  const comparison = await gh.compareBranches('main', 'dev');
  const commits = comparison.commits.filter((c) => !c.isMerge).reverse();
  const changes = await Promise.all(
    commits.map(async (c, index) => {
      const files =
        index < MAX_DETAILED
          ? await gh
              .getCommit(c.sha)
              .then((d) => d.files)
              .catch((): string[] => [])
          : [];
      return { sha: c.sha, title: c.title, author: c.author, at: c.at, files };
    }),
  );
  return {
    count: changes.length,
    compareUrl: comparison.url || `https://github.com/${env.SITE_REPO}/compare/main...dev`,
    changes,
  };
}
