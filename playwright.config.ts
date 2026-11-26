import { defineConfig, devices } from "@playwright/test";

// End-to-end scenarios of the app on `wastech-learn serve` over a fresh copy of the golden sample: one copy
// and one server per run, so tests run one after another in a single worker and share nothing else.
export default defineConfig({
  testDir: "packages/app/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./packages/app/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter:
    process.env.CI === undefined
      ? "list"
      : [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    // A locally installed Chrome stands in when the bundled Chromium is missing: PW_CHANNEL=chrome.
    ...(process.env.PW_CHANNEL === undefined
      ? {}
      : { channel: process.env.PW_CHANNEL }),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
