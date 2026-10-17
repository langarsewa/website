import type { Bindings } from './env';
import { UpstreamError } from './errors';

const API = 'https://api.cloudflare.com/client/v4';

/** The subset of a Pages deployment the console reads. */
export type CfDeployment = {
  id: string;
  url: string;
  environment: 'production' | 'preview';
  created_on: string;
  modified_on?: string;
  latest_stage?: { name: string; status: string; ended_on?: string | null } | null;
  deployment_trigger?: {
    type?: string;
    metadata?: { branch?: string; commit_hash?: string; commit_message?: string } | null;
  } | null;
  aliases?: string[] | null;
};

export type CfProject = {
  name: string;
  canonical_deployment?: { id: string } | null;
};

type Envelope<T> = {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result: T;
};

export type DeploymentEnvironment = 'production' | 'preview';

export interface CloudflareClient {
  listDeployments(project: string, environment?: DeploymentEnvironment): Promise<CfDeployment[]>;
  getDeployment(project: string, id: string): Promise<CfDeployment>;
  getProject(project: string): Promise<CfProject>;
  rollback(project: string, id: string): Promise<CfDeployment>;
}

export function isSuccessful(deployment: CfDeployment): boolean {
  return deployment.latest_stage?.name === 'deploy' && deployment.latest_stage.status === 'success';
}

export function createCloudflareClient(env: Bindings): CloudflareClient {
  const base = `${API}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`;

  async function call<T>(method: 'GET' | 'POST', path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${env.CLOUDFLARE_PAGES_TOKEN}`,
          accept: 'application/json',
        },
      });
    } catch (err) {
      throw UpstreamError.from('cloudflare', err);
    }
    // JSON boundary: the envelope is checked for `success` before `result` is trusted.
    const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!response.ok || !envelope || envelope.success !== true) {
      const message = envelope?.errors?.[0]?.message ?? `HTTP ${response.status}`;
      throw new UpstreamError('cloudflare', response.status, message);
    }
    return envelope.result;
  }

  return {
    listDeployments(project, environment) {
      const query = environment ? `?env=${environment}` : '';
      return call<CfDeployment[]>('GET', `/${project}/deployments${query}`);
    },
    getDeployment(project, id) {
      return call<CfDeployment>('GET', `/${project}/deployments/${encodeURIComponent(id)}`);
    },
    getProject(project) {
      return call<CfProject>('GET', `/${project}`);
    },
    rollback(project, id) {
      return call<CfDeployment>(
        'POST',
        `/${project}/deployments/${encodeURIComponent(id)}/rollback`,
      );
    },
  };
}
