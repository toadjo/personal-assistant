import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, type IpcMainInvokeEvent } from "electron";
import type { BrowserWindow } from "electron";
import { isDevServerUrl } from "./config/dev-server";

export function assertTrustedIpcSender(event: IpcMainInvokeEvent, getMainWindow: () => BrowserWindow | null): void {
  const mainWindow = getMainWindow();
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) {
    throw new Error("Blocked IPC request from unknown sender.");
  }
  const senderUrl = event.senderFrame?.url ?? "";
  const isFileUrl = isTrustedFileUrl(senderUrl);
  const isDev = !app.isPackaged && isDevServerUrl(senderUrl);
  if (!isFileUrl && !isDev) {
    throw new Error("Blocked IPC request from untrusted origin.");
  }
}

export function isTrustedNavigationTarget(targetUrl: string): boolean {
  if (isTrustedFileUrl(targetUrl)) return true;
  return !app.isPackaged && isDevServerUrl(targetUrl);
}

function isTrustedFileUrl(targetUrl: string): boolean {
  if (!targetUrl.startsWith("file://")) return false;
  if (!app.isPackaged) return true;
  try {
    const normalizedTargetPath = path.resolve(fileURLToPath(targetUrl));
    const trustedRoot = path.resolve(path.join(app.getAppPath(), "dist", "renderer"));
    return normalizedTargetPath === trustedRoot || normalizedTargetPath.startsWith(`${trustedRoot}${path.sep}`);
  } catch {
    return false;
  }
}
