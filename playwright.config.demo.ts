import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on',
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 },
    screenshot: 'on'
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 500 // Slow down for better visibility
        }
      },
    },
  ],
})