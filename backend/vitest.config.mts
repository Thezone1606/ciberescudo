import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Las pruebas con base de datos comparten tablas (y las métricas son globales): se ejecutan
    // una tras otra para que los conteos exactos sean deterministas.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
