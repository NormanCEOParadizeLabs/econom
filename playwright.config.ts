import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout : application compilée (next start) + pile Supabase locale.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", locale: "fr-FR", trace: "off", screenshot: "only-on-failure" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] }, testMatch: /responsive/ },
    { name: "petit-ecran", use: { browserName: "chromium", viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, testMatch: /responsive/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /responsive|desktop/ },
  ],
  webServer: { command: "npm run start", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 120_000 },
});
