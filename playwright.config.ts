import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1, // demo-mode store is process-wide; keep runs deterministic
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // Allow overriding the browser binary (e.g. preinstalled environments
    // where the Playwright-pinned revision isn't downloaded).
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Force demo mode + mock billing regardless of local .env files.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      AI_API_KEY: "",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      ALLOW_MOCK_BILLING: "true",
    },
  },
});
