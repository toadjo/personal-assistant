/**
 * Loads compiled preload in a headless BrowserWindow to catch missing generated files,
 * broken imports, or contextBridge registration failures (no repo imports in preload).
 *
 * Run after `npm run build:main`: `npm run test:preload-electron`
 */
import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const preloadPath = join(root, "dist", "main", "main", "preload.js");
const pagePath = join(dirname(fileURLToPath(import.meta.url)), "preload-smoke-page.html");

if (!existsSync(preloadPath)) {
  console.error("Missing preload bundle:", preloadPath);
  process.exit(1);
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadPath
    }
  });

  win.webContents.on("preload-error", (_event, preloadPathErr, error) => {
    console.error("preload-error", preloadPathErr, error);
    process.exitCode = 1;
  });

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("did-fail-load", code, desc);
    process.exitCode = 1;
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
      app.quit();
    }
  });
});
