import path from "node:path";
import { URL } from "node:url";
import { app, BrowserWindow, session } from "electron";
import { resolveAppIconPath } from "./icons";
import { getConfiguredDevServerUrl } from "./config/dev-server";
import { isTrustedNavigationTarget } from "./security";

let defaultContentSecurityPolicyInstalled = false;

/**
 * Tight CSP for packaged builds; dev relaxes script/connect so Vite HMR and the dev server keep working.
 * Safe to call before `app` is ready (defers until `ready`) and safe to call more than once (no-op after first install).
 * This avoids crashes when stale `dist/` or another caller touches `session.defaultSession` too early.
 */
export function installDefaultContentSecurityPolicy(): void {
  const apply = (): void => {
    if (defaultContentSecurityPolicyInstalled) return;
    defaultContentSecurityPolicyInstalled = true;
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...(details.responseHeaders ?? {}) };
      const csp = app.isPackaged
        ? "default-src 'self'; script-src 'self'"
        : [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:* wss://127.0.0.1:* wss://localhost:*"
          ].join("; ");
      responseHeaders["Content-Security-Policy"] = [csp];
      callback({ responseHeaders });
    });
  };

  if (app.isReady()) {
    apply();
  } else {
    app.once("ready", apply);
  }
}

export type AppWindowRole = "desk" | "household";

export function createWindow(role: AppWindowRole): BrowserWindow {
  const isHousehold = role === "household";
  const appIconPath = resolveAppIconPath();
  const window = new BrowserWindow({
    width: isHousehold ? 760 : 980,
    height: isHousehold ? 640 : 720,
    show: isHousehold,
    title: isHousehold ? "Household" : "Personal Assistant",
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webviewTag: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isTrustedNavigationTarget(targetUrl)) {
      event.preventDefault();
    }
  });

  const devUrl = getConfiguredDevServerUrl();
  if (!app.isPackaged && process.env.ELECTRON_E2E_TEST_MODE !== "1") {
    const url = new URL(devUrl);
    url.hash = isHousehold ? "household" : "";
    window.loadURL(url.toString());
  } else {
    const indexPath =
      process.env.ELECTRON_E2E_TEST_MODE === "1"
        ? path.join(__dirname, "..", "..", "renderer", "index.html")
        : path.join(app.getAppPath(), "dist", "renderer", "index.html");
    if (isHousehold) {
      window.loadFile(indexPath, { hash: "household" });
    } else {
      window.loadFile(indexPath);
    }
  }

  return window;
}

export function showMainWindow(window: BrowserWindow): void {
  if (!window.isVisible()) window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
}
