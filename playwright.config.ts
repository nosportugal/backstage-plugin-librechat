import {defineConfig, devices} from "@playwright/test";

/**
 * Playwright end-to-end configuration.
 *
 * The tests run against the plugin dev app (`yarn start`), which mounts the
 * chat bubble globally. CI reads the JSON report to summarise the results on
 * the pull request.
 */
export default defineConfig({
  testDir: "./e2e",
  // Run sequentially against the single shared dev server.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", {open: "never"}],
    ["json", {outputFile: "playwright-report/results.json"}],
  ],
  outputDir: "e2e/test-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: {width: 1280, height: 800},
  },
  projects: [
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
    },
  ],
  webServer: {
    command: "yarn start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
