/** Response contract shared with the web UI. Keep in step with docs/api.md. */
import type { Role } from './env';

export type MeResponse = { email: string; role: Role };

export type DeploymentSummary = {
  url: string;
  deploymentId: string | null;
  commit: string | null;
  message: string | null;
  at: string | null;
  by: string | null;
};

export type CiSummary = {
  status: string | null;
  conclusion: string | null;
  url: string | null;
  at: string | null;
};

export type StatusResponse = {
  production: DeploymentSummary;
  test: DeploymentSummary;
  ci: { main: CiSummary; dev: CiSummary };
  check: { ok: boolean; at: string | null; url: string | null };
};

export type PendingChange = {
  sha: string;
  title: string;
  author: string;
  at: string;
  files: string[];
};

export type PendingResponse = { count: number; compareUrl: string; changes: PendingChange[] };

export type PublishState = 'waiting' | 'ready' | 'merged' | 'failed';

export type PublishCheck = { name: string; status: string; conclusion: string | null };

export type PublishResponse = {
  pr: { number: number; url: string };
  state: PublishState;
  checks: PublishCheck[];
};

export type PublishIdle = { pr: null; state: 'idle' };

export type HistoryDeployment = {
  id: string;
  url: string;
  at: string;
  commit: string | null;
  message: string | null;
  by: string | null;
  environment: 'production';
  isCurrent: boolean;
};

export type HistoryResponse = { deployments: HistoryDeployment[] };

export type RestoreResponse = { ok: true; deploymentId: string };
