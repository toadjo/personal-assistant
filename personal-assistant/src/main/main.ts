import path from "node:path";
import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, type IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { getDb } from "./db";
import { createNote, deleteNote, listNotes } from "./services/notes";
import { completeReminder, createReminder, deleteReminder, listReminders, snoozeReminder, startReminderScheduler } from "./services/reminders";
import { configureHomeAssistant, getHomeAssistantConfig, refreshEntities, testConnection, toggleEntity } from "./services/homeAssistant";
import { createTimeRule, listRules, runAutomationCycle } from "./services/automation";
import { getAssistantSettings, saveAssistantName } from "./services/settings";

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let automationTimer: NodeJS.Timeout | null = null;
let stopAutomationScheduler: (() => void) | null = null;
let isQuitting = false;
const AUTOMATION_CYCLE_INTERVAL_MS = 60_000;

const noteCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(10_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(25),
  pinned: z.boolean()
});

const reminderCreateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  dueAt: z.string().datetime({ offset: true }),
  recurrence: z.enum(["none", "daily"])
});

const haConfigSchema = z.object({
  url: z.string().trim().min(1).max(2_048),
  token: z.string().trim().max(4_096)
});
const uuidSchema = z.string().uuid();
const optionalQuerySchema = z.string().optional();
const positiveIntegerSchema = z.number().int().positive();
const haEntityIdSchema = z.string().trim().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/i, "Invalid Home Assistant entity id");
const assistantNameSchema = z.string().trim().min(1).max(60);

const ruleCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  triggerConfig: z.object({ at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid HH:MM time") }),
  actionType: z.enum(["localReminder", "haToggle"]),
  actionConfig: z.object({
    text: z.string().trim().min(1).max(500).optional(),
    entityId: z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/i, "Invalid Home Assistant entity id").optional()
  }).refine((value) => Object.keys(value).length > 0, "Rule action config is required"),
  enabled: z.boolean()
}).superRefine((value, ctx) => {
  if (value.actionType === "localReminder" && !value.actionConfig.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reminder text is required for localReminder actions",
      path: ["actionConfig", "text"]
    });
  }
  if (value.actionType === "haToggle" && !value.actionConfig.entityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Entity ID is required for haToggle actions",
      path: ["actionConfig", "entityId"]
    });
  }
});

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
        showMainWindow(window);
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
  ipcMain.handle("notes:list", (event, query) => {
    assertTrustedIpcSender(event);
    return listNotes(optionalQuerySchema.parse(query));
  });
  ipcMain.handle("notes:create", (event, payload) => {
    assertTrustedIpcSender(event);
    return createNote(noteCreateSchema.parse(payload));
  });
  ipcMain.handle("notes:delete", (event, id) => {
    assertTrustedIpcSender(event);
    return deleteNote(uuidSchema.parse(id));
  });
  ipcMain.handle("reminders:list", (event) => {
    assertTrustedIpcSender(event);
    return listReminders();
  });
  ipcMain.handle("reminders:create", (event, payload) => {
    assertTrustedIpcSender(event);
    return createReminder(reminderCreateSchema.parse(payload));
  });
  ipcMain.handle("reminders:complete", (event, id) => {
    assertTrustedIpcSender(event);
    return completeReminder(uuidSchema.parse(id));
  });
  ipcMain.handle("reminders:delete", (event, id) => {
    assertTrustedIpcSender(event);
    return deleteReminder(uuidSchema.parse(id));
  });
  ipcMain.handle("reminders:snooze", (event, id, minutes) => {
    assertTrustedIpcSender(event);
    return snoozeReminder(uuidSchema.parse(id), positiveIntegerSchema.parse(minutes));
  });

  ipcMain.handle("ha:configure", (event, payload) => {
    assertTrustedIpcSender(event);
    const parsed = haConfigSchema.parse(payload);
    return configureHomeAssistant(parsed.url, parsed.token);
  });
  ipcMain.handle("ha:getConfig", (event) => {
    assertTrustedIpcSender(event);
    return getHomeAssistantConfig();
  });
  ipcMain.handle("ha:test", (event) => {
    assertTrustedIpcSender(event);
    return testConnection();
  });
  ipcMain.handle("ha:refresh", (event) => {
    assertTrustedIpcSender(event);
    return refreshEntities();
  });
  ipcMain.handle("ha:toggle", (event, entityId) => {
    assertTrustedIpcSender(event);
    return toggleEntity(haEntityIdSchema.parse(entityId));
  });
  ipcMain.handle("ha:listDevices", (event) => {
    assertTrustedIpcSender(event);
    return getDb().prepare("SELECT * FROM devices_cache ORDER BY friendlyName ASC").all();
  });
  ipcMain.handle("settings:getAssistant", (event) => {
    assertTrustedIpcSender(event);
    return getAssistantSettings();
  });
  ipcMain.handle("settings:setAssistantName", (event, name) => {
    assertTrustedIpcSender(event);
    return saveAssistantName(assistantNameSchema.parse(name));
  });
  ipcMain.handle("automation:logs", (event) => {
    assertTrustedIpcSender(event);
    const rows = getDb()
      .prepare(
        `SELECT
          l.id,
          l.ruleId,
          l.status,
          l.startedAt,
          l.endedAt,
          l.error,
          l.attemptCount,
          l.retryCount,
          r.name AS ruleName,
          r.actionType,
          r.actionConfig
        FROM execution_logs l
        LEFT JOIN automation_rules r ON r.id = l.ruleId
        ORDER BY l.startedAt DESC
        LIMIT 100`
      )
      .all() as Array<{
      id: string;
      ruleId: string;
      status: string;
      startedAt: string;
      endedAt: string;
      error: string | null;
      attemptCount: number | null;
      retryCount: number | null;
      ruleName: string | null;
      actionType: string | null;
      actionConfig: string | null;
    }>;
    return rows.map((row) => ({
      id: row.id,
      ruleId: row.ruleId,
      status: row.status,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      error: row.error ?? undefined,
      attemptCount: row.attemptCount ?? 1,
      retryCount: row.retryCount ?? 0,
      ruleName: row.ruleName ?? "Unknown rule",
      actionLabel: formatAutomationActionLabel(row.actionType, row.actionConfig)
    }));
  });
  ipcMain.handle("automation:rules:list", (event) => {
    assertTrustedIpcSender(event);
    return listRules();
  });
  ipcMain.handle("automation:rules:create", (event, payload) => {
    assertTrustedIpcSender(event);
    return createTimeRule(ruleCreateSchema.parse(payload));
  });
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

function showMainWindow(window: BrowserWindow): void {
  if (!window.isVisible()) window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
}

function startAutomationScheduler(): () => void {
  if (automationTimer) {
    clearTimeout(automationTimer);
    automationTimer = null;
  }
  let isStopped = false;
  let isRunningCycle = false;
  const scheduleNext = () => {
    if (isStopped) return;
    automationTimer = setTimeout(() => {
      if (isRunningCycle) {
        scheduleNext();
        return;
      }
      isRunningCycle = true;
      void runAutomationCycle()
        .catch((error) => {
          console.error("Automation cycle failed", toErrorMessage(error));
        })
        .finally(() => {
          isRunningCycle = false;
          scheduleNext();
        });
    }, AUTOMATION_CYCLE_INTERVAL_MS);
    automationTimer.unref();
  };
  scheduleNext();

  return () => {
    isStopped = true;
    if (automationTimer) {
      clearTimeout(automationTimer);
      automationTimer = null;
    }
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function assertTrustedIpcSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url ?? "";
  const isFileUrl = senderUrl.startsWith("file://");
  const isDevUrl = !app.isPackaged && (senderUrl.startsWith("http://localhost:5173") || senderUrl.startsWith("http://127.0.0.1:5173"));
  if (!isFileUrl && !isDevUrl) {
    throw new Error("Blocked IPC request from untrusted origin.");
  }
}

function formatAutomationActionLabel(actionType: string | null, actionConfigRaw: string | null): string {
  let actionConfig: Record<string, string> = {};
  if (actionConfigRaw) {
    try {
      actionConfig = JSON.parse(actionConfigRaw) as Record<string, string>;
    } catch {
      // Keep API resilient if config parsing fails for legacy rows.
    }
  }
  if (actionType === "localReminder") {
    return `Create reminder${actionConfig.text ? `: ${actionConfig.text}` : ""}`;
  }
  if (actionType === "haToggle") {
    return `Toggle device${actionConfig.entityId ? `: ${actionConfig.entityId}` : ""}`;
  }
  return "Run automation action";
}
