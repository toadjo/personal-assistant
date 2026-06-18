/**
 * Loads compiled preload in a headless BrowserWindow to catch missing generated files,
 * broken imports, or contextBridge registration failures (no repo imports in preload).
 *
 * Run after `npm run build:main`: `npm run test:preload-electron`
 */
const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");

const electronModule = require("electron");
const { app, BrowserWindow } = electronModule;

const repoRoot = resolve(__dirname, "..", "..");
const preloadPath = join(repoRoot, "dist", "main", "main", "preload.js");
const pagePath = join(repoRoot, "scripts", "preload-smoke-page.html");

// Diagnostics
console.log("Preload smoke test diagnostics:");
console.log("  Electron version:", process.versions.electron);
console.log("  Node version:", process.versions.node);
console.log("  ELECTRON_RUN_AS_NODE:", process.env.ELECTRON_RUN_AS_NODE ?? "<unset>");
console.log("  NODE_OPTIONS:", process.env.NODE_OPTIONS ?? "<unset>");
console.log("  typeof require('electron'):", typeof electronModule);
if (electronModule && typeof electronModule === "object") {
  console.log("  electron keys (first 30):", Object.keys(electronModule).slice(0, 30));
}
console.log("  Repo root:", repoRoot);
console.log("  Preload path:", preloadPath);
console.log("  Page path:", pagePath);

// Guard: ensure Electron main-process API loaded correctly
if (!app || !BrowserWindow) {
  console.error("Electron main-process API did not load");
  console.error("  process.versions:", process.versions);
  console.error("  typeof app:", typeof app);
  console.error("  typeof BrowserWindow:", typeof BrowserWindow);
  process.exit(1);
}

if (!existsSync(preloadPath)) {
  console.error("Missing preload bundle:", preloadPath);
  process.exit(1);
}

let testTimedOut = false;
const TEST_TIMEOUT_MS = 10000;
const timeoutId = setTimeout(() => {
  testTimedOut = true;
  console.error("Preload smoke test timed out after", TEST_TIMEOUT_MS, "ms");
  process.exitCode = 1;
  app.quit();
}, TEST_TIMEOUT_MS);

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath
    }
  });

  win.webContents.on("preload-error", (_event, preloadPathErr, error) => {
    console.error("preload-error");
    console.error("  preloadPath:", preloadPathErr);
    console.error("  error.name:", error.name);
    console.error("  error.message:", error.message);
    console.error("  error.stack:", error.stack);
    process.exitCode = 1;
    clearTimeout(timeoutId);
    app.quit();
  });

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("did-fail-load", code, desc);
    process.exitCode = 1;
    clearTimeout(timeoutId);
    app.quit();
  });

  void win.loadFile(pagePath);

  win.webContents.on("did-finish-load", async () => {
    try {
      let t = "undefined";
      for (let i = 0; i < 40; i += 1) {
        t = await win.webContents.executeJavaScript("typeof window.assistantApi");
        if (t === "object") break;
        await new Promise((r) => setTimeout(r, 50));
      }
      if (t !== "object") {
        console.error("Expected typeof window.assistantApi === 'object', got:", t);
        process.exitCode = 1;
        return;
      }
      const hasListNotes = await win.webContents.executeJavaScript("typeof window.assistantApi.listNotes");
      if (hasListNotes !== "function") {
        console.error("assistantApi.listNotes missing");
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    } finally {
      clearTimeout(timeoutId);
      if (!testTimedOut) {
        app.quit();
      }
    }
  });
});
