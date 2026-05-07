const { test: base, _electron: electron } = require("@playwright/test");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");

const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const test = base.extend({
  electronApp: async ({}, use) => {
    const userDataDir = path.join(os.tmpdir(), `personal-assistant-e2e-${randomUUID()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    const buildPath = process.env.ELECTRON_E2E_BUILD_PATH || path.join(repoRoot, "dist");
    const mainPath = path.join(buildPath, "main", "main", "main.js");

    if (!fs.existsSync(mainPath)) {
      throw new Error(
        `Electron main entry point not found:\n` +
          `  repoRoot: ${repoRoot}\n` +
          `  buildPath: ${buildPath}\n` +
          `  mainPath: ${mainPath}`
      );
    }

    const electronApp = await electron.launch({
      args: [mainPath],
      cwd: repoRoot,
      env: {
        ...process.env,
        ELECTRON_E2E_TEST_MODE: "1",
        ELECTRON_E2E_USER_DATA_DIR: userDataDir
      }
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.getByRole("textbox", { name: /message the assistant/i }).waitFor();

    window.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Electron E2E Console Error]: ${msg.text()}`);
      }
    });

    window.on("pageerror", (err) => {
      console.error(`[Electron E2E Page Error]: ${err}`);
    });

    await use(electronApp);

    await electronApp.close();

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      console.warn("[Electron E2E] Failed to clean up user-data");
    }
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await use(window);
  },

  userDataDir: async ({}, use) => {
    await use("");
  }
});

module.exports = { test, expect: require("@playwright/test").expect };
