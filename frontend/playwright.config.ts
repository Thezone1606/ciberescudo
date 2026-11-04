import { defineConfig } from "@playwright/test";

// E2E contra los servidores de desarrollo (se reutilizan si ya están corriendo).
// Usa Microsoft Edge instalado (sin descargar navegadores); en CI: PW_CHANNEL=chromium tras `npx playwright install chromium`.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    channel: process.env.PW_CHANNEL ?? "msedge",
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
  },
  webServer: [
    { command: "npm --prefix ../backend run dev", url: "http://localhost:4000/api/v1/health", reuseExistingServer: true, timeout: 120_000 },
    { command: "npm run dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 180_000 },
  ],
});
