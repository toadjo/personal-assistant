import { Menu, Tray } from "electron";
import type { BrowserWindow } from "electron";
import { IpcRendererEvent } from "../shared/ipc-channels";
import { createTrayIcon } from "./icons";
import { safeWebContentsSend } from "./ipc-safe-send";
import { showMainWindow } from "./window";

export type TrayOptions = {
  getDeskWindow: () => BrowserWindow | null;
  openHouseholdWindow: () => void;
  onQuit: () => void;
};

let trayInstance: Tray | null = null;

/**
 * Creates (or recreates) the tray icon. Call after Explorer/taskbar resets or when a second instance
 * focuses the primary process so the tray is visible again.
 */
export function createTray(options: TrayOptions): Tray {
  if (trayInstance) {
    try {
      trayInstance.removeAllListeners();
      trayInstance.destroy();
    } catch {
      // ignore
    }
    trayInstance = null;
  }

  const tray = new Tray(createTrayIcon());
  trayInstance = tray;
  const menu = Menu.buildFromTemplate([
    {
      label: "Open desk",
      click: () => {
        const w = options.getDeskWindow();
        if (w) showMainWindow(w);
      }
    },
    { label: "Open Household", click: () => options.openHouseholdWindow() },
    { type: "separator" },
    {
      label: "Quick note",
      click: () => {
        const w = options.getDeskWindow();
        if (!w) return;
        showMainWindow(w);
        safeWebContentsSend(w.webContents, IpcRendererEvent.command, "new note");
      }
    },
    {
      label: "Quit",
      click: () => options.onQuit()
    }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip("Personal Assistant");
  tray.on("click", () => {
    const w = options.getDeskWindow();
    if (!w) return;
    if (w.isVisible()) w.hide();
    else showMainWindow(w);
  });
  return tray;
}
