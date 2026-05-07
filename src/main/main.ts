import {
  app,
  crashReporter,
  type BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  powerMonitor,
  type MenuItemConstructorOptions
} from "electron";
import * as Sentry from "@sentry/electron/main";
import { getDb } from "./db";
import { startReminderScheduler } from "./services/reminders";
import { startTaskScheduler } from "./services/tasks";
import { createAssertSender, registerIpcHandlers } from "./ipc/register-handlers";
import { registerAppWindowHandlers } from "./ipc/handlers/appWindow.handlers";
import { createWindow, installDefaultContentSecurityPolicy, showMainWindow } from "./window";
import { createTray, type TrayOptions } from "./tray";
import { startAutomationScheduler } from "./automation-scheduler";
import { mainLog } from "./log";
import { IpcRendererEvent } from "../shared/ipc-channels";
import { safeWebContentsSend } from "./ipc-safe-send";

let deskWin: BrowserWindow | null = null;
let householdWin: BrowserWindow | null = null;
let reminderSchedulerStop: (() => void) | null = null;
let stopAutomationScheduler: (() => void) | null = null;
let stopTaskScheduler: (() => void) | null = null;
let isQuitting = false;
let trayOptions: TrayOptions | null = null;

function getTrustedWindows(): readonly (BrowserWindow | null)[] {
  return [deskWin, householdWin];
}

function recreateTrayFromStoredOptions(): void {
  if (!trayOptions) return;
  try {
    createTray(trayOptions);
  } catch (error) {
    mainLog.error("Tray recreation failed", error);
  }
}

function openOrFocusHouseholdWindow(): void {
  if (householdWin && !householdWin.isDestroyed()) {
    showMainWindow(householdWin);
    return;
  }
  householdWin = createWindow("household");
  householdWin.on("closed", () => {
    householdWin = null;
  });
  householdWin.show();
}

function focusDeskWindow(): void {
  if (deskWin && !deskWin.isDestroyed()) {
    showMainWindow(deskWin);
  }
}

function hideDeskWindow(): void {
  if (deskWin && !deskWin.isDestroyed()) {
    deskWin.hide();
  }
}

function ensureDeskWindow(): void {
  if (deskWin && !deskWin.isDestroyed()) {
    showMainWindow(deskWin);
  } else {
    deskWin = createWindow("desk");
    deskWin.on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        deskWin?.hide();
      }
    });
    if (deskWin) {
      showMainWindow(deskWin);
    }
  }
}

function createMacOSMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        {
          label: "About",
          click: () => {
            ensureDeskWindow();
            if (deskWin && !deskWin.isDestroyed()) {
              safeWebContentsSend(deskWin.webContents, IpcRendererEvent.showAbout);
            }
          }
        },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Open Desk",
          click: () => {
            ensureDeskWindow();
          }
        },
        {
          label: "Open Household",
          click: () => {
            openOrFocusHouseholdWindow();
          }
        },
        { type: "separator" },
        { role: "minimize" },
        { role: "zoom" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function startAppAfterDbOpen(): void {
  if (process.platform === "darwin") {
    createMacOSMenu();
  } else {
    Menu.setApplicationMenu(null);
  }

  registerIpcHandlers(getTrustedWindows);
  registerAppWindowHandlers(createAssertSender(getTrustedWindows), {
    openHouseholdWindow: openOrFocusHouseholdWindow,
    focusDeskWindow,
    hideDeskWindow
  });

  const isE2ETestMode = process.env.ELECTRON_E2E_TEST_MODE === "1";
  if (!isE2ETestMode) {
    const hideDeskShortcut = "CommandOrControl+Shift+H";
    try {
      globalShortcut.register(hideDeskShortcut, () => {
        hideDeskWindow();
      });
    } catch (error) {
      mainLog.warn(`Global shortcut registration failed (${hideDeskShortcut})`, error);
    }
  }

  deskWin = createWindow("desk");
  deskWin.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      deskWin?.hide();
    }
  });

  if (deskWin) {
    showMainWindow(deskWin);

    if (!isE2ETestMode) {
      trayOptions = {
        getDeskWindow: () => deskWin,
        openHouseholdWindow: openOrFocusHouseholdWindow,
        onQuit: () => {
          isQuitting = true;
          app.quit();
        }
      };
      createTray(trayOptions);
    }
  }

  if (!isE2ETestMode) {
    reminderSchedulerStop = startReminderScheduler(getTrustedWindows).stop;
    stopTaskScheduler = startTaskScheduler(getTrustedWindows).stop;
    stopAutomationScheduler = startAutomationScheduler();
  }
}

const isE2ETestMode = process.env.ELECTRON_E2E_TEST_MODE === "1";
if (!isE2ETestMode && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  if (isE2ETestMode && process.env.ELECTRON_E2E_USER_DATA_DIR) {
    app.setPath("userData", process.env.ELECTRON_E2E_USER_DATA_DIR);
  }

  app.on("second-instance", () => {
    mainLog.info("Second instance: restoring tray if needed and focusing desk window.");
    if (!isE2ETestMode) {
      recreateTrayFromStoredOptions();
    }
    focusDeskWindow();
  });

  if (process.platform === "win32") {
    powerMonitor.on("resume", () => {
      mainLog.info("System resumed; recreating tray icon in case the taskbar was reset.");
      if (!isE2ETestMode) {
        recreateTrayFromStoredOptions();
      }
    });
  }

  app.whenReady().then(() => {
    installDefaultContentSecurityPolicy();
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: app.isPackaged ? "production" : "development"
      });
    }
    const crashSubmitUrl = process.env.ELECTRON_CRASH_REPORT_URL?.trim();
    if (app.isPackaged && crashSubmitUrl) {
      crashReporter.start({
        companyName: "Personal Assistant",
        submitURL: crashSubmitUrl,
        uploadToServer: true,
        compress: true
      });
    }
    try {
      getDb();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The local database could not be opened (disk full, file locked, or database damaged).";
      mainLog.error("Database startup failed", error);
      dialog.showErrorBox("Personal Assistant - database error", `${message}\n\nThe app will exit.`);
      app.exit(1);
      return;
    }

    try {
      startAppAfterDbOpen();
    } catch (error) {
      mainLog.error("Application startup failed after database open", error);
      const message = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox("Personal Assistant - startup error", `${message}\n\nThe app will exit.`);
      app.exit(1);
    }
  });

  app.on("before-quit", () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    if (process.env.SENTRY_DSN) {
      void Sentry.close(2000).catch(() => {
        /* ignore flush errors on exit */
      });
    }
    reminderSchedulerStop?.();
    reminderSchedulerStop = null;
    stopAutomationScheduler?.();
    stopAutomationScheduler = null;
    stopTaskScheduler?.();
    stopTaskScheduler = null;
  });

  app.on("activate", () => {
    ensureDeskWindow();
  });
}
