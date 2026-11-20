import { defineConfig } from "vitest/config";
import path from "node:path";

// Essais manuels contre les API réelles (payants) : jamais inclus dans `npm test`.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") } },
  test: { include: ["tests/manual/**/*.test.ts"], environment: "node", testTimeout: 400000, setupFiles: ["tests/setup.ts"] },
});
