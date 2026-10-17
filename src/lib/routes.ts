/** The seven pages, in navigation order. `slug` is the path segment; '' is Home. */
export interface Route {
  slug: '' | 'our-story' | 'our-work' | 'impact' | 'future-vision' | 'join-the-sewa' | 'contact';
  /** i18n key prefix under `nav.` for the label and mobile description. */
  key: 'home' | 'ourStory' | 'ourWork' | 'impact' | 'futureVision' | 'joinTheSewa' | 'contact';
}

export const routes: readonly Route[] = [
  { slug: '', key: 'home' },
  { slug: 'our-story', key: 'ourStory' },
  { slug: 'our-work', key: 'ourWork' },
  { slug: 'impact', key: 'impact' },
  { slug: 'future-vision', key: 'futureVision' },
  { slug: 'join-the-sewa', key: 'joinTheSewa' },
  { slug: 'contact', key: 'contact' },
] as const;

export type Slug = Route['slug'];

export function pathFor(slug: Slug): string {
  return slug === '' ? '/' : `/${slug}/`;
}

/** Hash routes used by the reference and by links already shared: '#/our-work/locations'. */
export function legacyHashToPath(hash: string): { path: string; anchor: string } | null {
  if (!hash.startsWith('#/')) return null;
  const [slug = '', anchor = ''] = hash.slice(2).split('/');
  const known = routes.some((r) => r.slug === slug);
  return { path: known ? pathFor(slug as Slug) : '/', anchor: known ? anchor : '' };
}
