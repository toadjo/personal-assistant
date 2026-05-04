import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: path.join(__dirname, "tests", "e2e-electron"),
  fullyParallel: false, // Electron apps share state; run sequentially
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    // Electron-specific context will be set by the test harness
  },
  globalSetup: path.join(__dirname, "tests", "e2e-electron", "global-setup.ts"),
  globalTeardown: path.join(__dirname, "tests", "e2e-electron", "global-teardown.ts"),
  webServer: undefined // Electron manages its own lifecycle
});
