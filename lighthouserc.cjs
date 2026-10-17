// Lighthouse CI budgets from the brief (mobile, median of 3 runs).
const routes = [
  '/',
  '/our-story/',
  '/our-work/',
  '/impact/',
  '/future-vision/',
  '/join-the-sewa/',
  '/contact/',
];
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: routes.map((r) => `http://localhost/${r.replace(/^\//, '')}`),
      numberOfRuns: 3,
      settings: { formFactor: 'mobile', screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false } },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'largest-contentful-paint': [
          'warn',
          { maxNumericValue: 2500, aggregationMethod: 'median' },
        ],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.05, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/report' },
  },
};
