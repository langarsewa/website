import type { ImageMetadata } from 'astro';

/**
 * Every photo under src/assets/images, keyed by file name, so content JSON can refer to
 * an image as "children-sharing-a-langar-meal.webp" and components resolve it here.
 */
const modules = import.meta.glob<ImageMetadata>('/src/assets/images/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  import: 'default',
});

const byName = new Map<string, ImageMetadata>();
for (const [path, meta] of Object.entries(modules)) {
  byName.set(path.split('/').pop() as string, meta);
}

export function image(fileName: string): ImageMetadata {
  const meta = byName.get(fileName);
  if (!meta) throw new Error(`Unknown image "${fileName}" (expected in src/assets/images)`);
  return meta;
}

export const imageNames = [...byName.keys()].sort();
