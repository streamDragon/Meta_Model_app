const { defineConfig, devices } = require('playwright/test');

const HOST = process.env.PLAYWRIGHT_BASE_HOST || '127.0.0.1';
const PORT = process.env.PLAYWRIGHT_BASE_PORT || '4173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${HOST}:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  outputDir: 'test-results/playwright',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'mobile-iphone13',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'mobile-pixel7',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
