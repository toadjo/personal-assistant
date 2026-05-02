import type { WebContents } from "electron";
import { mainLog } from "./log";

/** Avoids crashing the scheduler if `webContents` is torn down between checks and `send` (TOCTOU). */
export function safeWebContentsSend(webContents: WebContents, channel: string, ...payload: unknown[]): void {
  try {
    if (webContents.isDestroyed()) return;
    Reflect.apply(webContents.send as (...args: unknown[]) => void, webContents, [channel, ...payload]);
  } catch (error) {
    mainLog.warn(`IPC send failed (${channel})`, error);
  }
}
