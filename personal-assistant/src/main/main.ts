import { app, type BrowserWindow } from "electron";
import { getDb } from "./db";
import { startReminderScheduler } from "./services/reminders";
import { registerIpcHandlers } from "./ipc/register-handlers";
import { createWindow, showMainWindow } from "./window";
import { createTray } from "./tray";
import { startAutomationScheduler } from "./automation-scheduler";

let win: BrowserWindow | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let stopAutomationScheduler: (() => void) | null = null;
let isQuitting = false;

app.whenReady().then(() => {
  getDb();
  registerIpcHandlers(() => win);
  win = createWindow();
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  if (win) {
    showMainWindow(win);
    createTray(win, () => {
      isQuitting = true;
      app.quit();
    });
  }
  reminderTimer = startReminderScheduler(win!);
  stopAutomationScheduler = startAutomationScheduler();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (reminderTimer) clearInterval(reminderTimer);
  stopAutomationScheduler?.();
  stopAutomationScheduler = null;
});

app.on("activate", () => {
  if (!win) return;
  showMainWindow(win);
});
