/** Names and initials from whatever the API gives us: a full name, a GitHub login or an email. */

function titleCase(word: string): string {
  return word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** "hsingh@langarsewa.org" → "Hsingh"; "harpreet.kaur@…" → "Harpreet"; "Hardeep Singh" → "Hardeep". */
export function firstName(who: string | null | undefined): string {
  if (!who) return '';
  const local = who.includes('@') ? (who.split('@')[0] ?? '') : who;
  const first = local.split(/[\s._-]+/).filter(Boolean)[0] ?? '';
  return titleCase(first);
}

/** Up to two initials, upper-case. "Hardeep Singh" → "HS", "harpreet.kaur@x" → "HK", "simran" → "S". */
export function initials(who: string | null | undefined): string {
  if (!who) return '';
  const local = who.includes('@') ? (who.split('@')[0] ?? '') : who;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join('');
}
