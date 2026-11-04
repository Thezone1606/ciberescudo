import { defineConfig } from "vitest/config";

// Las pruebas E2E (e2e/*.e2e.ts) las corre Playwright, no vitest.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
