import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, type IpcMainInvokeEvent } from "electron";
import type { BrowserWindow } from "electron";
import { isDevServerUrl } from "./config/dev-server";

export function assertTrustedIpcSender(
  event: IpcMainInvokeEvent,
  getTrustedWindows: () => readonly (BrowserWindow | null)[]
): void {
  const windows = getTrustedWindows().filter((w): w is BrowserWindow => Boolean(w));
  if (!windows.length || !windows.some((w) => event.sender.id === w.webContents.id)) {
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

/** Normalized-path containment check (no `path.resolve`); used for packaged `file:` URL allowlists. */
export function isPathInsideTrustedRoot(candidatePath: string, trustedRootDir: string): boolean {
  const normalizedRoot = path.normalize(trustedRootDir);
  const normalizedCandidate = path.normalize(candidatePath);
  if (!path.isAbsolute(normalizedRoot) || !path.isAbsolute(normalizedCandidate)) {
    return false;
  }
  const rel = path.relative(normalizedRoot, normalizedCandidate);
  if (rel === "") return true;
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  return true;
}

function isTrustedFileUrl(targetUrl: string): boolean {
  if (!targetUrl.startsWith("file://")) return false;
  if (!app.isPackaged) return true;
  try {
    const decodedPath = fileURLToPath(targetUrl);
    const trustedRoot = path.join(app.getAppPath(), "dist", "renderer");
    return isPathInsideTrustedRoot(decodedPath, trustedRoot);
  } catch {
    return false;
  }
}
