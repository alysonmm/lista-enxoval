import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 20000,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(rootDir, "./tests/mocks/server-only.ts"),
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
