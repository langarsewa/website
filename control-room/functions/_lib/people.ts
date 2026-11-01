import directory from '../../config/people.json';
import type { Role } from './env';

export type People = { owners: string[]; editors: string[] };

export const defaultPeople: People = directory;

/** Case-insensitive lookup. Owners win if an email is listed in both. */
export function roleFor(email: string, people: People = defaultPeople): Role | null {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const has = (list: string[]) => list.some((entry) => entry.trim().toLowerCase() === needle);
  if (has(people.owners)) return 'owner';
  if (has(people.editors)) return 'editor';
  return null;
}
