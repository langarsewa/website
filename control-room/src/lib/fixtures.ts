/**
 * Fixtures for mock mode. Times are relative to "now" so the relative-time copy stays sensible
 * however long after writing this the page is opened. Scenes change the shape of the day:
 * healthy (default), problem, down, editor, empty, forbidden, offline.
 */
import type { History, Me, Pending, PublishCurrent, Status } from './types';

export type Scene = 'healthy' | 'problem' | 'down' | 'editor' | 'empty' | 'forbidden' | 'offline';

export const SCENES: readonly Scene[] = [
  'healthy',
  'problem',
  'down',
  'editor',
  'empty',
  'forbidden',
  'offline',
];

export const PRODUCTION_URL = 'https://langarsewa.org';
export const TEST_URL = 'https://dev.langarsewa.pages.dev';

const minutesAgo = (n: number, now: Date) => new Date(now.getTime() - n * 60_000).toISOString();
const hoursAgo = (n: number, now: Date) => minutesAgo(n * 60, now);
const daysAgo = (n: number, now: Date) => hoursAgo(n * 24, now);

export function me(scene: Scene): Me {
  return scene === 'editor'
    ? { email: 'harpreet@langarsewa.org', role: 'editor' }
    : { email: 'hardeep@langarsewa.org', role: 'owner' };
}

export function status(scene: Scene, now: Date = new Date()): Status {
  const base: Status = {
    production: {
      url: PRODUCTION_URL,
      deploymentId: 'dep_prod_0917',
      commit: '9f3c2a1',
      message: 'Launch version: all pages, both languages',
      at: daysAgo(1, now),
      by: 'Hardeep Singh',
    },
    test: {
      url: TEST_URL,
      deploymentId: 'dep_dev_1042',
      commit: 'b71e4d0',
      message: 'Impact page: meals figure updated to 1,42,000',
      at: hoursAgo(2, now),
      by: 'Harpreet Kaur',
    },
    ci: {
      main: {
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/langarsewa/website/actions/runs/1001',
        at: daysAgo(1, now),
      },
      dev: {
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/langarsewa/website/actions/runs/1007',
        at: hoursAgo(2, now),
      },
    },
    check: {
      ok: true,
      at: minutesAgo(10, now),
      url: 'https://github.com/langarsewa/website/actions/runs/1008',
    },
  };
  if (scene === 'problem') {
    base.ci.main = {
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/langarsewa/website/actions/runs/1009',
      at: minutesAgo(12, now),
    };
  }
  if (scene === 'down') {
    base.check = {
      ok: false,
      at: minutesAgo(3, now),
      url: 'https://github.com/langarsewa/website/actions/runs/1010',
    };
  }
  return base;
}

export function pending(scene: Scene, now: Date = new Date()): Pending {
  if (scene === 'empty') {
    return {
      count: 0,
      compareUrl: 'https://github.com/langarsewa/website/compare/main...dev',
      changes: [],
    };
  }
  return {
    count: 2,
    compareUrl: 'https://github.com/langarsewa/website/compare/main...dev',
    changes: [
      {
        sha: 'b71e4d0',
        title: 'Impact page: meals figure updated to 1,42,000',
        author: 'Harpreet Kaur',
        at: hoursAgo(2, now),
        files: ['src/content/impact.json'],
      },
      {
        sha: '5c0a9e2',
        title: 'Our Story: new photo of the Madhir kitchen',
        author: 'Simran Kaur',
        at: daysAgo(1, now),
        files: ['public/photos/our-story/madhir-kitchen-3.jpg', 'src/content/our-story.json'],
      },
    ],
  };
}

export function history(scene: Scene, now: Date = new Date()): History {
  const live = scene === 'problem' || scene === 'down' ? daysAgo(1, now) : daysAgo(1, now);
  return {
    deployments: [
      {
        id: 'dep_prod_0917',
        url: 'https://9f3c2a1.langarsewa.pages.dev',
        at: live,
        commit: '9f3c2a1',
        message: 'Launch version: all pages, both languages',
        by: 'Hardeep Singh',
        environment: 'production',
        isCurrent: true,
      },
      {
        id: 'dep_prod_0916',
        url: 'https://3d8b7c6.langarsewa.pages.dev',
        at: hoursAgo(39, now),
        commit: '3d8b7c6',
        message: 'Contact page: WhatsApp number added',
        by: 'Hardeep Singh',
        environment: 'production',
        isCurrent: false,
      },
      {
        id: 'dep_prod_0915',
        url: 'https://a12f90e.langarsewa.pages.dev',
        at: daysAgo(2, now),
        commit: 'a12f90e',
        message: 'Impact: milestone for the Punjab floods added',
        by: 'Harpreet Kaur',
        environment: 'production',
        isCurrent: false,
      },
    ],
  };
}

/**
 * A publish that advances with wall-clock time since it started, so the Publishing page can be
 * watched end to end in mock mode: waiting (0 to 20 s), ready (20 to 30 s), merged after.
 * Scene "problem" fails at the check step instead.
 */
export function publishAfter(
  startedAt: number,
  scene: Scene,
  now: Date = new Date(),
): PublishCurrent {
  const elapsed = (now.getTime() - startedAt) / 1000;
  const pr = { number: 42, url: 'https://github.com/langarsewa/website/pull/42' };
  const names = [
    'Both languages complete',
    'Looks right on phone',
    'Looks right on laptop',
    'No broken links',
    'Accessible',
    'Fast on mobile',
    'Buttons and forms work',
  ];
  const doneCount = Math.min(names.length, Math.floor(elapsed / 3));
  const checks = names.map((name, i) => ({
    name,
    status: i < doneCount ? 'completed' : i === doneCount ? 'in_progress' : 'queued',
    conclusion: i < doneCount ? 'success' : null,
  }));
  if (scene === 'problem' && elapsed > 9) {
    const failing = checks[0];
    if (failing) {
      failing.status = 'completed';
      failing.conclusion = 'failure';
    }
    return { pr, state: 'failed', checks };
  }
  if (elapsed < 21) return { pr, state: 'waiting', checks };
  if (elapsed < 30) {
    return {
      pr,
      state: 'ready',
      checks: names.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    };
  }
  return {
    pr,
    state: 'merged',
    checks: names.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
  };
}
