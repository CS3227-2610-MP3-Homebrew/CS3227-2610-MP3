import { defineConfig, devices } from "@playwright/test";
import { localAuthConfiguration } from "./tests/e2e/accounts/local";

const localAccounts = localAuthConfiguration();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // Keep generated browser artifacts out of the reviewable working tree.
  outputDir: ".next/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [{
    command: "bun run build && bun run start --hostname 127.0.0.1 --port 3100",
    env: {
      APP_ENV: "local",
      AI_PROVIDER: "disabled",
      NEXT_PUBLIC_SUPABASE_URL: localAccounts.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localAccounts.publicKey,
      SUPABASE_SECRET_KEY: localAccounts.secretKey,
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  }, {
    command: "bun node_modules/next/dist/bin/next build tests/e2e/auth/harness --webpack && bun node_modules/next/dist/bin/next start tests/e2e/auth/harness --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 120_000,
  }],
});
