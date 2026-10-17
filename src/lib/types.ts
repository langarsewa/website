/**
 * API shapes. These mirror docs/architecture.md and the contract agreed with the API
 * (functions/api). Keep this file the single place the web app learns a shape from.
 */

export type Role = 'owner' | 'editor';

export interface Me {
  email: string;
  role: Role;
}

export interface Deployment {
  url: string;
  deploymentId: string;
  commit: string;
  message: string;
  at: string;
  by: string;
}

export type CiStatus = 'queued' | 'in_progress' | 'completed' | string;
export type CiConclusion =
  'success' | 'failure' | 'cancelled' | 'neutral' | 'skipped' | null | string;

export interface CiRun {
  status: CiStatus;
  conclusion: CiConclusion;
  url: string | null;
  at: string | null;
}

export interface SiteCheck {
  ok: boolean;
  at: string | null;
  url: string | null;
}

export interface Status {
  production: Deployment;
  test: Deployment;
  ci: { main: CiRun; dev: CiRun };
  check: SiteCheck;
}

export interface PendingChange {
  sha: string;
  title: string;
  author: string;
  at: string;
  files: string[];
}

export interface Pending {
  count: number;
  compareUrl: string;
  changes: PendingChange[];
}

export type PublishState = 'waiting' | 'ready' | 'merged' | 'failed';

export interface PublishCheck {
  name: string;
  status: CiStatus;
  conclusion: CiConclusion;
}

export interface Publish {
  pr: { number: number; url: string };
  state: PublishState;
  checks: PublishCheck[];
}

export interface PublishIdle {
  pr: null;
  state: 'idle';
}

export type PublishCurrent = Publish | PublishIdle;

export interface HistoryDeployment {
  id: string;
  url: string;
  at: string;
  commit: string;
  message: string;
  by: string;
  environment: string;
  isCurrent: boolean;
}

export interface History {
  deployments: HistoryDeployment[];
}

export interface RestoreResult {
  ok: true;
  deploymentId: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
