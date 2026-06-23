import { loadEnvFile } from "./config/loadEnvFile";

loadEnvFile();

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
import { configureTeamRealtime, stopAllTeamRealtime } from "./team/realtime";
import { createWindow, installDefaultContentSecurityPolicy, showMainWindow } from "./window";
import { type TrayOptions } from "./tray";
import { routeDeskBackground, tryCreateTray } from "./desk-background";
import { startAutomationScheduler } from "./automation-scheduler";
import { startAutoBackupScheduler } from "./auto-backup-scheduler";
import { mainLog } from "./log";
import { IpcRendererEvent } from "../shared/ipc-channels";
import { safeWebContentsSend } from "./ipc-safe-send";
import { isCrashReportingAllowed } from "./security/policy";

export const APP_USER_MODEL_ID = "com.toadjo.personalassistant";

// Set Windows AppUserModelID before any window/tray creation or single-instance lock
if (process.platform === "win32") {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

let deskWin: BrowserWindow | null = null;
let householdWin: BrowserWindow | null = null;
let reminderSchedulerStop: (() => void) | null = null;
let stopAutomationScheduler: (() => void) | null = null;
let stopAutoBackupScheduler: (() => void) | null = null;
let stopTaskScheduler: (() => void) | null = null;
let isQuitting = false;
let trayOptions: TrayOptions | null = null;
let trayAvailable = false;

function getTrustedWindows(): readonly (BrowserWindow | null)[] {
  return [deskWin, householdWin];
}

function recreateTrayFromStoredOptions(): void {
  if (!trayOptions) return;
  trayAvailable = tryCreateTray(trayOptions);
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
  routeDeskBackground(deskWin, process.platform, trayAvailable);
}

function ensureDeskWindow(): void {
  if (deskWin && !deskWin.isDestroyed()) {
    showMainWindow(deskWin);
  } else {
    deskWin = createWindow("desk");
    deskWin.on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        routeDeskBackground(deskWin, process.platform, trayAvailable);
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
  configureTeamRealtime(getTrustedWindows);
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

    const quickCaptureShortcut = "CommandOrControl+Alt+N";
    try {
      globalShortcut.register(quickCaptureShortcut, () => {
        const w = deskWin;
        if (!w) return;
        showMainWindow(w);
        safeWebContentsSend(w.webContents, IpcRendererEvent.command, "quick capture");
      });
    } catch (error) {
      mainLog.warn(`Global shortcut registration failed (${quickCaptureShortcut})`, error);
    }
  }

  deskWin = createWindow("desk");
  deskWin.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      routeDeskBackground(deskWin, process.platform, trayAvailable);
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
      trayAvailable = tryCreateTray(trayOptions);
    }
  }

  if (!isE2ETestMode) {
    reminderSchedulerStop = startReminderScheduler(getTrustedWindows).stop;
    stopTaskScheduler = startTaskScheduler(getTrustedWindows).stop;
    stopAutomationScheduler = startAutomationScheduler();
    stopAutoBackupScheduler = startAutoBackupScheduler();
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
    if (process.env.SENTRY_DSN && isCrashReportingAllowed()) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: app.isPackaged ? "production" : "development"
      });
    }
    const crashSubmitUrl = process.env.ELECTRON_CRASH_REPORT_URL?.trim();
    if (app.isPackaged && crashSubmitUrl && isCrashReportingAllowed()) {
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
    stopAutoBackupScheduler?.();
    stopAutoBackupScheduler = null;
    stopTaskScheduler?.();
    stopTaskScheduler = null;
    void stopAllTeamRealtime();
  });

  app.on("activate", () => {
    ensureDeskWindow();
  });
}
