// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read from test-specific env file.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  // ----------------------------------------------------------------
  // Directory and file structure
  // ----------------------------------------------------------------
  testDir: './e2e',
  
  // ----------------------------------------------------------------
  // Global settings
  // ----------------------------------------------------------------
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // ----------------------------------------------------------------
  // Shared settings for all projects
  // ----------------------------------------------------------------
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  // ----------------------------------------------------------------
  // Web server configuration
  // ----------------------------------------------------------------
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // ----------------------------------------------------------------
  // Project configurations
  // ----------------------------------------------------------------
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});