/** Date and time helpers. Every function takes an optional `now` so tests are deterministic. */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9:30 AM" */
export function formatTime(d: Date): string {
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** "Fri 17 Oct, 9:30 AM" (adds the year when it is not the current one). */
export function formatWhen(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const day = DAY_NAMES[d.getDay()] ?? '';
  const month = MONTH_NAMES[d.getMonth()] ?? '';
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${day} ${d.getDate()} ${month}${year}, ${formatTime(d)}`;
}

/** "Fri 17 Oct" without the time. */
export function formatDay(value: string | Date | null | undefined, now: Date = new Date()): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const day = DAY_NAMES[d.getDay()] ?? '';
  const month = MONTH_NAMES[d.getMonth()] ?? '';
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${day} ${d.getDate()} ${month}${year}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Short relative time in the prototype's register: "just now", "10 min ago", "2 h ago",
 * "yesterday", "3 days ago", then the day ("Fri 17 Oct") beyond a week. Future values read
 * "just now".
 */
export function relativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24 && startOfDay(d) === startOfDay(now)) return `${hours} h ago`;
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff <= 1) return hours < 24 ? `${hours} h ago` : 'yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return formatDay(d, now);
}

/** "today", "yesterday", or "Wed 15 Oct": the form the prototype uses next to an author. */
export function dayWord(value: string | Date | null | undefined, now: Date = new Date()): string {
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  return formatDay(d, now);
}

/** "Good morning" / "Good afternoon" / "Good evening" by local hour. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
