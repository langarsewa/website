/**
 * Regions excluded from pixel comparison. Keep this list empty unless something is truly
 * non-deterministic, and justify each entry in a comment. Selectors apply to both pages.
 */
export const masks: { selector: string; reason: string }[] = [];
