/* eslint-disable @typescript-eslint/no-require-imports, react-hooks/rules-of-hooks */
import { test as base, ElectronApplication, Page, _electron as electron } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type ElectronFixtures = {
  electronApp: ElectronApplication;
  window: Page;
  userDataDir: string;
};

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // Create isolated user-data directory for each test
    const userDataDir = path.join(os.tmpdir(), `personal-assistant-e2e-${randomUUID()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    console.log(`[Electron E2E] Using isolated user-data: ${userDataDir}`);

    // Path to the built main process entry point
    const buildPath = process.env.ELECTRON_E2E_BUILD_PATH || path.join(__dirname, "..", "..", "dist");
    const mainPath = path.join(buildPath, "main", "main", "main.js");

    // Launch Electron with isolated user-data
    const electronApp = await electron.launch({
      executablePath: require("electron") as string,
      args: [mainPath],
      env: {
        ...process.env,
        ELECTRON_E2E_TEST_MODE: "1",
        ELECTRON_E2E_USER_DATA_DIR: userDataDir
      }
    });

    // Wait for the first window to appear
    const window = await electronApp.firstWindow();

    // Wait for the app to be fully loaded
    await window.waitForLoadState("networkidle");

    await use(electronApp);

    // Cleanup: close the app and remove user-data directory
    await electronApp.close();

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      console.log(`[Electron E2E] Cleaned up user-data: ${userDataDir}`);
    } catch {
      console.warn(`[Electron E2E] Failed to clean up user-data`);
    }
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await use(window);
  },

  // eslint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    // This is a placeholder; the actual directory is created in electronApp fixture
    await use("");
  }
});

export { expect } from "@playwright/test";
