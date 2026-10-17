import { describe, expect, it } from 'vitest';
import { dayWord, formatWhen, greeting, relativeTime } from '../../src/lib/time';

// Fixed "now": Friday 17 Oct 2026, 10:12 local time.
const now = new Date(2026, 9, 17, 10, 12, 0);
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('formatWhen', () => {
  it('renders the prototype form "Sat 17 Oct, 9:30 AM"', () => {
    expect(formatWhen(new Date(2026, 9, 17, 9, 30), now)).toBe('Sat 17 Oct, 9:30 AM');
    expect(formatWhen(new Date(2026, 9, 16, 18, 10), now)).toBe('Fri 16 Oct, 6:10 PM');
  });

  it('adds the year only when it differs from now, and returns "" for bad input', () => {
    expect(formatWhen(new Date(2025, 0, 3, 0, 5), now)).toBe('Fri 3 Jan 2025, 12:05 AM');
    expect(formatWhen('not a date', now)).toBe('');
    expect(formatWhen(null, now)).toBe('');
  });
});

describe('relativeTime', () => {
  it('steps from "just now" through minutes and hours', () => {
    expect(relativeTime(ago(20_000), now)).toBe('just now');
    expect(relativeTime(ago(10 * MIN), now)).toBe('10 min ago');
    expect(relativeTime(ago(2 * HOUR), now)).toBe('2 h ago');
  });

  it('switches to days and then to the date', () => {
    expect(relativeTime(ago(24 * HOUR + 2 * HOUR), now)).toBe('yesterday');
    expect(relativeTime(ago(3 * 24 * HOUR), now)).toBe('3 days ago');
    expect(relativeTime(ago(10 * 24 * HOUR), now)).toBe('Wed 7 Oct');
  });

  it('never reads a future time as negative', () => {
    expect(relativeTime(new Date(now.getTime() + 5 * MIN), now)).toBe('just now');
  });
});

describe('dayWord and greeting', () => {
  it('says today, yesterday, then the day', () => {
    expect(dayWord(ago(HOUR), now)).toBe('today');
    expect(dayWord(ago(26 * HOUR), now)).toBe('yesterday');
    expect(dayWord(ago(2 * 24 * HOUR), now)).toBe('Thu 15 Oct');
  });

  it('greets by local hour', () => {
    expect(greeting(new Date(2026, 9, 17, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 17, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 17, 19))).toBe('Good evening');
  });
});
