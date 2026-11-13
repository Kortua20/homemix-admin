import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the flows that only a real browser can exercise: async Server
// Components (the accounting page, the product page), server actions, and the database
// functions behind them, all together. Unit and component tests live next to the code and
// run with Vitest (`pnpm test`).
//
// Runs against the LOCAL Supabase stack only — see e2e/support/local-supabase.ts. Every test
// creates and removes its own data.

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  // Serial: the suite is small, and one dev server compiling pages for parallel workers is
  // slower and flakier than running the tests one after another.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // First visits compile pages in `next dev`, which can take a while.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    // Locally, the installed Google Chrome — no browser download needed. In CI, the
    // Chromium that `npx playwright install chromium` provides.
    channel: process.env.CI ? undefined : "chrome",
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/staff.json" },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3001",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
