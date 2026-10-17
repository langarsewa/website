import { describe, expect, it } from 'vitest';
import {
  attention,
  countLabel,
  filesLabel,
  isTerminal,
  needsAttention,
  publishView,
  siteHealth,
  summarizeCi,
  titleOf,
} from '../../src/lib/derive';
import * as fixtures from '../../src/lib/fixtures';
import type { PublishCurrent } from '../../src/lib/types';

const now = new Date(2026, 9, 17, 10, 12, 0);

describe('needsAttention / attention', () => {
  it('is quiet on a healthy day', () => {
    const s = fixtures.status('healthy', now);
    expect(needsAttention(s)).toBe(false);
    expect(attention(s)).toBeNull();
    expect(siteHealth(s)).toBe('healthy');
  });

  it('flags a failed publish on main with the Change page as the first step', () => {
    const s = fixtures.status('problem', now);
    expect(needsAttention(s)).toBe(true);
    const a = attention(s);
    expect(a?.kind).toBe('publish-failed');
    expect(a?.title).toBe('The last publish did not go through');
    expect(a?.primary.href).toBe('/change/');
    expect(a?.secondary.href).toBe(s.ci.main.url);
  });

  it('flags a failed site check ahead of CI, pointing at History', () => {
    const s = fixtures.status('down', now);
    expect(needsAttention(s)).toBe(true);
    expect(siteHealth(s)).toBe('attention');
    expect(attention(s)?.kind).toBe('site-down');
    expect(attention(s)?.primary.href).toBe('/history/');
  });

  it('treats a never-run check as unknown, not broken', () => {
    const s = fixtures.status('healthy', now);
    s.check = { ok: true, at: null, url: null };
    expect(siteHealth(s)).toBe('unknown');
    expect(needsAttention(s)).toBe(false);
  });
});

describe('summarizeCi', () => {
  it('maps status and conclusion to a tone and label', () => {
    expect(
      summarizeCi({ status: 'completed', conclusion: 'success', url: null, at: null }),
    ).toEqual({
      tone: 'ok',
      label: 'Passed',
    });
    expect(summarizeCi({ status: 'in_progress', conclusion: null, url: null, at: null })).toEqual({
      tone: 'warn',
      label: 'Running',
    });
    expect(
      summarizeCi({ status: 'completed', conclusion: 'failure', url: null, at: null }).tone,
    ).toBe('bad');
    expect(summarizeCi(null).label).toBe('Not run yet');
  });
});

describe('publishView', () => {
  const pr = { number: 42, url: 'https://github.com/langarsewa/website/pull/42' };
  const checks = (done: number, failed = false) =>
    ['A', 'B', 'C'].map((name, i) => ({
      name,
      status: i < done ? 'completed' : 'in_progress',
      conclusion: i < done ? (failed && i === 0 ? 'failure' : 'success') : null,
    }));

  it('is idle without a pull request', () => {
    const v = publishView({ pr: null, state: 'idle' });
    expect(v.state).toBe('idle');
    expect(v.steps.every((s) => s.state === 'todo')).toBe(true);
    expect(isTerminal(v.state)).toBe(false);
  });

  it('walks waiting → ready → merged', () => {
    const waitingEarly = publishView({ pr, state: 'waiting', checks: checks(0) }, 2);
    expect(waitingEarly.stepIndex).toBe(2);
    expect(waitingEarly.steps.map((s) => s.state)).toEqual(['done', 'current', 'todo', 'todo']);
    expect(waitingEarly.steps[0]?.detail).toBe('2 changes from the test site');

    const waitingLate = publishView({ pr, state: 'waiting', checks: checks(2) });
    expect(waitingLate.stepIndex).toBe(3);
    expect(waitingLate.steps[2]?.detail).toBe('2 of 3 passed');

    const ready = publishView({ pr, state: 'ready', checks: checks(3) });
    expect(ready.steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current']);

    const merged = publishView({ pr, state: 'merged', checks: checks(3) });
    expect(merged.progress).toBe(100);
    expect(isTerminal(merged.state)).toBe(true);
  });

  it('names the failed check and stops polling', () => {
    const current: PublishCurrent = { pr, state: 'failed', checks: checks(1, true) };
    const v = publishView(current);
    expect(v.state).toBe('failed');
    expect(v.failedCheck).toBe('A');
    expect(v.steps[2]?.state).toBe('failed');
    expect(v.steps[3]?.state).toBe('todo');
    expect(isTerminal(v.state)).toBe(true);
  });

  it('mock publish advances with the clock and fails only in the problem scene', () => {
    const start = now.getTime();
    expect(fixtures.publishAfter(start, 'healthy', new Date(start + 5_000)).state).toBe('waiting');
    expect(fixtures.publishAfter(start, 'healthy', new Date(start + 25_000)).state).toBe('ready');
    expect(fixtures.publishAfter(start, 'healthy', new Date(start + 40_000)).state).toBe('merged');
    expect(fixtures.publishAfter(start, 'problem', new Date(start + 12_000)).state).toBe('failed');
  });
});

describe('small labels', () => {
  it('counts and titles read naturally', () => {
    expect(countLabel(0)).toBe('No changes');
    expect(countLabel(1)).toBe('1 change');
    expect(countLabel(2)).toBe('2 changes');
    expect(titleOf('Impact: figure updated\n\nLonger body')).toBe('Impact: figure updated');
    expect(titleOf('   ')).toBe('Untitled change');
    expect(filesLabel(['src/content/impact.json'])).toBe('impact.json');
    expect(filesLabel(['a/x.json', 'b/y.jpg', 'c/z.md'])).toBe('3 files: x.json, y.jpg and 1 more');
  });
});
