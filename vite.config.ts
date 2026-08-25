import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/three")) return "three";
        },
      },
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["src/infrastructure/svg-parser/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/domain/value-objects/**",
        "src/domain/entities/**",
        "src/application/**",
        "src/infrastructure/**",
      ],
      exclude: [
        "**/ports/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "src/infrastructure/workers/geometry.worker.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
