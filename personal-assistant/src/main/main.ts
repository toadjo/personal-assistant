import path from "node:path";
import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from "electron";
import { getDb } from "./db";
import { createNote, listNotes } from "./services/notes";
import { completeReminder, createReminder, listReminders, startReminderScheduler } from "./services/reminders";
import { configureHomeAssistant, getHomeAssistantConfig, refreshEntities, testConnection, toggleEntity } from "./services/homeAssistant";
import { createTimeRule, listRules, runAutomationCycle } from "./services/automation";

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let automationTimer: NodeJS.Timeout | null = null;
let isQuitting = false;

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 980,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  if (!app.isPackaged) {
    window.loadURL(devUrl);
  } else {
    window.loadFile(path.join(app.getAppPath(), "dist", "renderer", "index.html"));
  }

  return window;
}

function createTray(window: BrowserWindow): void {
  tray = new Tray(createTrayIcon());
  const menu = Menu.buildFromTemplate([
    { label: "Open Assistant", click: () => showMainWindow(window) },
    { type: "separator" },
    {
      label: "Quick Note",
      click: () => {
        window.show();
        window.webContents.send("command", "new note");
      }
    },
    { label: "Quit", click: () => {
      isQuitting = true;
      app.quit();
    } }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip("Personal Assistant");
  tray.on("click", () => window.isVisible() ? window.hide() : showMainWindow(window));
}

function registerIpc(): void {
  ipcMain.handle("notes:list", (_, query) => listNotes(query));
  ipcMain.handle("notes:create", (_, payload) => createNote(payload));
  ipcMain.handle("reminders:list", () => listReminders());
  ipcMain.handle("reminders:create", (_, payload) => createReminder(payload));
  ipcMain.handle("reminders:complete", (_, id) => completeReminder(id));

  ipcMain.handle("ha:configure", (_, payload) => configureHomeAssistant(payload.url, payload.token));
  ipcMain.handle("ha:getConfig", () => getHomeAssistantConfig());
  ipcMain.handle("ha:test", () => testConnection());
  ipcMain.handle("ha:refresh", () => refreshEntities());
  ipcMain.handle("ha:toggle", (_, entityId) => toggleEntity(entityId));
  ipcMain.handle("ha:listDevices", () =>
    getDb().prepare("SELECT * FROM devices_cache ORDER BY friendlyName ASC").all()
  );
  ipcMain.handle("automation:logs", () =>
    getDb().prepare("SELECT * FROM execution_logs ORDER BY startedAt DESC LIMIT 100").all()
  );
  ipcMain.handle("automation:rules:list", () => listRules());
  ipcMain.handle("automation:rules:create", (_, payload) => createTimeRule(payload));
}

app.whenReady().then(() => {
  getDb();
  registerIpc();
  win = createWindow();
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  showMainWindow(win);
  createTray(win);
  reminderTimer = startReminderScheduler(win);
  automationTimer = setInterval(() => {
    void runAutomationCycle();
  }, 60_000);
});

app.on("before-quit", () => {
  isQuitting = true;
  if (reminderTimer) clearInterval(reminderTimer);
  if (automationTimer) clearInterval(automationTimer);
});

app.on("activate", () => {
  if (!win) return;
  showMainWindow(win);
});

function showMainWindow(window: BrowserWindow): void {
  if (!window.isVisible()) window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#1d4ed8"/>
      <path d="M4 8h8M8 4v8" stroke="#dbeafe" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `.trim();
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}
