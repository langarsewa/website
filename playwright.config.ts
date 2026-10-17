import { defineConfig, devices } from '@playwright/test';

/**
 * Three projects, all against the production build in dist/ served by tests/lib/static-server.mjs:
 *  - e2e: interaction tests
 *  - a11y: axe-core on every route in both languages
 *  - visual: pixel parity against reference/ (see tests/visual/parity.spec.ts)
 */
export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/lib/static-server.mjs dist 4321',
    url: 'http://127.0.0.1:4321/',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
  projects: [
    {
      name: 'e2e',
      testDir: 'tests/e2e',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile/,
    },
    { name: 'e2e-mobile', testDir: 'tests/e2e', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
    {
      name: 'a11y',
      testDir: 'tests/a11y',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
    {
      name: 'visual',
      testDir: 'tests/visual',
      use: { ...devices['Desktop Chrome'] },
      timeout: 15 * 60_000,
    },
  ],
});
