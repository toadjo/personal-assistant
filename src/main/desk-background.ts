import type { BrowserWindow } from "electron";
import { mainLog } from "./log";
import { createTray, type TrayOptions } from "./tray";

/**
 * Routes a request to send the desk window to the background.
 *
 * - Windows / macOS / Linux-with-tray: hide the window (recoverable from tray).
 * - Linux without a working tray: minimize to taskbar instead, so the window stays
 *   recoverable even if hide-to-tray would strand the user with no way back.
 */
export function routeDeskBackground(
  window: BrowserWindow | null,
  platform: NodeJS.Platform,
  trayAvailable: boolean
): void {
  if (!window || window.isDestroyed()) return;

  if (platform === "linux" && !trayAvailable) {
    if (!window.isMinimized()) window.minimize();
    return;
  }

  window.hide();
}

/**
 * Attempts to create the tray, returning whether tray-backed hide-to-tray is recoverable.
 *
 * On Linux without a system-tray host (e.g. some GNOME/Wayland setups) `new Tray(...)` throws.
 * Callers use the returned boolean as the practical signal for whether to fall back to
 * minimize-to-taskbar in `routeDeskBackground`.
 */
export function tryCreateTray(options: TrayOptions): boolean {
  try {
    createTray(options);
    return true;
  } catch (error) {
    mainLog.warn(
      "Tray creation failed. On Linux the desk window will minimize to the taskbar instead of hiding to tray.",
      error
    );
    return false;
  }
}
