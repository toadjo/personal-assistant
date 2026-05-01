import path from "node:path";
import { app, BrowserWindow } from "electron";
import { resolveAppIconPath } from "./icons";
import { getConfiguredDevServerUrl } from "./config/dev-server";
import { isTrustedNavigationTarget } from "./security";

export function createWindow(): BrowserWindow {
  const appIconPath = resolveAppIconPath();
  const window = new BrowserWindow({
    width: 980,
    height: 720,
    show: false,
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
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
  if (!app.isPackaged) {
    window.loadURL(devUrl);
  } else {
    window.loadFile(path.join(app.getAppPath(), "dist", "renderer", "index.html"));
  }

  return window;
}

export function showMainWindow(window: BrowserWindow): void {
  if (!window.isVisible()) window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
}
