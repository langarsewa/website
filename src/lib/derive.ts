/**
 * Pure state derivation. The pages render whatever these return; keeping the logic here means
 * it is unit-tested and the <script> blocks stay thin.
 */
import type { CiRun, Publish, PublishCurrent, PublishState, Status } from './types';

export type Health = 'healthy' | 'attention' | 'unknown';

export interface Attention {
  /** Short headline, e.g. "The last publish did not go through". */
  title: string;
  /** One or two sentences of plain-language explanation. */
  body: string;
  /** Where to send the person first. */
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** When the problem was observed, ISO. */
  at: string | null;
  kind: 'site-down' | 'publish-failed';
}

/** True when Home must show the red "Needs attention" card. */
export function needsAttention(status: Pick<Status, 'check' | 'ci'>): boolean {
  return !status.check.ok || status.ci.main.conclusion === 'failure';
}

export function siteHealth(status: Pick<Status, 'check'>): Health {
  if (status.check.at === null && status.check.ok) return 'unknown';
  return status.check.ok ? 'healthy' : 'attention';
}

export function attention(status: Pick<Status, 'check' | 'ci' | 'production'>): Attention | null {
  if (!status.check.ok) {
    return {
      kind: 'site-down',
      title: 'langarsewa.org is not answering',
      body: 'The last site check failed. Restoring the previous version usually fixes it within a minute. If the domain or email is affected, call Hardeep.',
      primary: { label: 'Restore a version', href: '/history/' },
      secondary: { label: 'See the check', href: status.check.url ?? '/history/' },
      at: status.check.at,
    };
  }
  if (status.ci.main.conclusion === 'failure') {
    return {
      kind: 'publish-failed',
      title: 'The last publish did not go through',
      body:
        'A check failed, so nothing changed. Visitors still see the version published ' +
        (status.production.by ? `by ${status.production.by}` : 'earlier') +
        '. Fix the change on the test site and publish again.',
      primary: { label: 'Fix the change', href: '/change/' },
      secondary: { label: 'See what failed', href: status.ci.main.url ?? '/review/' },
      at: status.ci.main.at,
    };
  }
  return null;
}

export type CheckTone = 'ok' | 'warn' | 'bad' | 'muted';

export interface CiSummary {
  tone: CheckTone;
  /** Short status for a badge: "Passed", "Running", "Failed", "Not run yet". */
  label: string;
}

export function summarizeCi(run: CiRun | null | undefined): CiSummary {
  if (!run || (!run.status && !run.conclusion)) return { tone: 'muted', label: 'Not run yet' };
  if (run.status !== 'completed') {
    return { tone: 'warn', label: run.status === 'queued' ? 'Queued' : 'Running' };
  }
  if (run.conclusion === 'success') return { tone: 'ok', label: 'Passed' };
  if (run.conclusion === 'failure') return { tone: 'bad', label: 'Failed' };
  if (run.conclusion === 'cancelled') return { tone: 'warn', label: 'Cancelled' };
  return { tone: 'muted', label: run.conclusion ? String(run.conclusion) : 'Finished' };
}

export type StepState = 'done' | 'current' | 'todo' | 'failed';

export interface PublishStep {
  title: string;
  detail: string;
  state: StepState;
}

export interface PublishView {
  state: PublishState | 'idle';
  stepIndex: number; // 1-based current step, 4 when done
  progress: number; // 0..100 for the bar
  steps: PublishStep[];
  failedCheck: string | null;
}

/** Describes checks for the step list: "3 of 7 passed", or the step copy from the prototype. */
function checksDetail(p: Publish): string {
  const total = p.checks.length;
  if (total === 0) return 'Languages, links, looks, speed, accessibility';
  const passed = p.checks.filter((c) => c.conclusion === 'success').length;
  return `${passed} of ${total} passed`;
}

export function publishView(current: PublishCurrent | null, pendingCount?: number): PublishView {
  const collected =
    pendingCount === undefined
      ? 'Changes from the test site'
      : `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} from the test site`;
  const base: PublishStep[] = [
    { title: 'Collected the changes', detail: collected, state: 'todo' },
    { title: 'Built the site', detail: 'All pages, both languages', state: 'todo' },
    {
      title: 'Checked everything',
      detail: 'Languages, links, looks, speed, accessibility',
      state: 'todo',
    },
    { title: 'Put it live', detail: 'Worldwide within a minute', state: 'todo' },
  ];
  const set = (i: number, s: StepState) => {
    const step = base[i];
    if (step) step.state = s;
  };

  if (!current || current.pr === null) {
    return { state: 'idle', stepIndex: 0, progress: 0, steps: base, failedCheck: null };
  }
  const p = current;
  const failed = p.checks.find((c) => c.conclusion === 'failure');
  const anyCheckDone = p.checks.some((c) => c.status === 'completed');
  const detail = checksDetail(p);
  const check = base[2];
  if (check) check.detail = detail;

  switch (p.state) {
    case 'waiting': {
      set(0, 'done');
      if (anyCheckDone) {
        set(1, 'done');
        set(2, 'current');
        return { state: 'waiting', stepIndex: 3, progress: 58, steps: base, failedCheck: null };
      }
      set(1, 'current');
      return { state: 'waiting', stepIndex: 2, progress: 36, steps: base, failedCheck: null };
    }
    case 'ready':
      set(0, 'done');
      set(1, 'done');
      set(2, 'done');
      set(3, 'current');
      return { state: 'ready', stepIndex: 4, progress: 86, steps: base, failedCheck: null };
    case 'merged':
      base.forEach((_, i) => set(i, 'done'));
      return { state: 'merged', stepIndex: 4, progress: 100, steps: base, failedCheck: null };
    case 'failed': {
      set(0, 'done');
      set(1, anyCheckDone || failed ? 'done' : 'failed');
      set(2, 'failed');
      return {
        state: 'failed',
        stepIndex: 3,
        progress: 58,
        steps: base,
        failedCheck: failed ? failed.name : null,
      };
    }
    default:
      return { state: 'idle', stepIndex: 0, progress: 0, steps: base, failedCheck: null };
  }
}

/** Polling should stop once the publish has reached a terminal state. */
export function isTerminal(state: PublishState | 'idle'): boolean {
  return state === 'merged' || state === 'failed';
}

/** "2 changes" / "1 change" / "No changes". */
export function countLabel(n: number, noun = 'change'): string {
  if (n === 0) return `No ${noun}s`;
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** First line of a commit message, trimmed; falls back when empty. */
export function titleOf(message: string | null | undefined, fallback = 'Untitled change'): string {
  const first = (message ?? '').split('\n')[0]?.trim() ?? '';
  return first.length > 0 ? first : fallback;
}

/** "src/content/impact.json, src/content/home.json" with a cap: "3 files". */
export function filesLabel(files: string[]): string {
  if (files.length === 0) return '';
  const short = files.map((f) => f.split('/').pop() ?? f);
  if (short.length <= 2) return short.join(', ');
  return `${short.length} files: ${short.slice(0, 2).join(', ')} and ${short.length - 2} more`;
}
