/**
 * Single client entry, loaded by Base.astro on every page. Each module guards for the
 * elements it needs, so a page without, say, a gallery pays nothing beyond the import.
 */
import { redirectLegacyHash } from './hash-redirect';
import { initLang } from './lang';
import { initMenu } from './menu';
import { initLightbox } from './lightbox';
import { initCopyButtons } from './copy';
import { initVideoToggle } from './videos';
import { initGalleries } from './gallery';
import { initContactForm } from './contact-form';
import { initAnalytics } from './analytics-init';

if (!redirectLegacyHash() && !initLang()) {
  initAnalytics();
  initMenu();
  initLightbox();
  initCopyButtons();
  initVideoToggle();
  initGalleries();
  initContactForm();
}
