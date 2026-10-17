import { legacyHashToPath } from '@/lib/routes';

/**
 * Links shared before launch look like /#/impact/milestones. The real page now lives at
 * /impact/#milestones (or /pa/impact/#milestones). Returns true when a redirect was issued.
 */
export function redirectLegacyHash(): boolean {
  const target = legacyHashToPath(location.hash);
  if (!target) return false;
  const onPa = location.pathname === '/pa/' || location.pathname.startsWith('/pa/');
  const wantsPa = onPa || new URLSearchParams(location.search).get('lang') === 'pa';
  const path = (wantsPa ? '/pa' : '') + target.path;
  const anchor = target.anchor ? `#${target.anchor}` : '';
  location.replace(path + anchor);
  return true;
}
