import { Menu, Tray } from "electron";
import type { BrowserWindow } from "electron";
import { createTrayIcon } from "./icons";
import { showMainWindow } from "./window";

export function createTray(window: BrowserWindow, onQuit: () => void): Tray {
  const tray = new Tray(createTrayIcon());
  const menu = Menu.buildFromTemplate([
    { label: "Open Assistant", click: () => showMainWindow(window) },
    { type: "separator" },
    {
      label: "Quick Note",
      click: () => {
        showMainWindow(window);
        window.webContents.send("command", "new note");
      }
    },
    {
      label: "Quit",
      click: () => onQuit()
    }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip("Personal Assistant");
  tray.on("click", () => (window.isVisible() ? window.hide() : showMainWindow(window)));
  return tray;
}
