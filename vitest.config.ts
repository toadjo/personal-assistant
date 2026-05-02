import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["src/renderer/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/renderer/**/*.{ts,tsx}", "src/main/**/*.ts", "src/shared/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/preload-ipc-literals.generated.ts",
        "src/renderer/test/**",
        "src/renderer/vite-env.d.ts",
        "src/renderer/main.tsx"
      ],
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 5,
        lines: 5
      }
    }
  }
});
