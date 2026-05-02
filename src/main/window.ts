import path from "node:path";
import { URL } from "node:url";
import { app, BrowserWindow } from "electron";
import { resolveAppIconPath } from "./icons";
import { getConfiguredDevServerUrl } from "./config/dev-server";
import { isTrustedNavigationTarget } from "./security";

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
    const url = new URL(devUrl);
    url.hash = isHousehold ? "household" : "";
    window.loadURL(url.toString());
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "renderer", "index.html");
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
