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
 * On Windows/macOS, tray creation is normally expected to succeed; a failure is unexpected
 * and may indicate an environment issue.
 *
 * Callers use the returned boolean as the practical signal for whether to fall back to
 * minimize-to-taskbar in `routeDeskBackground`.
 */
export function tryCreateTray(options: TrayOptions): boolean {
  try {
    createTray(options);
    return true;
  } catch (error) {
    if (process.platform === "linux") {
      mainLog.warn(
        "Tray creation failed. The desk window will minimize to the taskbar instead of hiding to tray.",
        error
      );
    } else {
      // Windows/macOS: tray creation should normally succeed; log a more serious warning
      // Note: on these platforms, hide-to-tray failure means the window may not be recoverable
      // since we don't fall back to minimize (Linux-only behavior).
      mainLog.warn(
        `Tray creation failed unexpectedly on ${process.platform}. The desk window will hide to tray, but if the tray is unavailable the app may not be recoverable. This may indicate an environment issue.`,
        error
      );
    }
    return false;
  }
}
