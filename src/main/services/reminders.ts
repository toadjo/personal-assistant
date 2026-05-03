import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import { Notification } from "electron";
import { showMainWindow } from "../window";
import { IpcRendererEvent } from "../../shared/ipc-channels";
import { getDb } from "../db";
import { safeWebContentsSend } from "../ipc-safe-send";
import { mainLog } from "../log";
import { Reminder } from "../../shared/types";

/** Upper bound so a far-future reminder does not block the process for days. */
const REMINDER_SCHEDULER_MAX_TIMER_MS = 6 * 60 * 60 * 1000;
/** Small floor so we re-check quickly when due times are imminent. */
const REMINDER_SCHEDULER_MIN_TIMER_MS = 500;
/** Safety net if timers slip (laptop sleep, clock skew). */
const REMINDER_SCHEDULER_SAFETY_INTERVAL_MS = 30 * 60 * 1000;
const REMINDER_SCHEDULER_BATCH_LIMIT = 200;

export function listReminders(): Reminder[] {
  return getDb()
    .prepare("SELECT * FROM reminders ORDER BY dueAt ASC")
    .all()
    .map((row) => mapReminder(row as Record<string, unknown>));
}

export function createReminder(input: Omit<Reminder, "id" | "status" | "notifyChannel">): Reminder {
  const reminder: Reminder = {
    id: randomUUID(),
    status: "pending",
    notifyChannel: "desktop",
    text: normalizeReminderText(input.text),
    dueAt: normalizeIsoDate(input.dueAt, "Reminder dueAt"),
    recurrence: input.recurrence === "daily" ? "daily" : "none"
  };
  getDb()
    .prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id,@text,@dueAt,@recurrence,@status,@notifyChannel)"
    )
    .run(reminder);
  return reminder;
}

export function completeReminder(id: string): void {
  validateId(id, "Reminder");
  getDb().prepare("UPDATE reminders SET status='done' WHERE id=@id").run({ id });
}

export function deleteReminder(id: string): void {
  validateId(id, "Reminder");
  getDb().prepare("DELETE FROM reminders WHERE id=@id").run({ id });
}

export function snoozeReminder(id: string, minutes: number): void {
  validateId(id, "Reminder");
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0 || minutes > 60 * 24 * 30) {
    throw new Error("Snooze time must be between 1 and 43,200 minutes.");
  }
  const reminder = getDb().prepare("SELECT * FROM reminders WHERE id=@id").get({ id }) as Reminder | undefined;
  if (!reminder) {
    throw new Error("Reminder not found.");
  }
  if (reminder.status !== "pending") {
    throw new Error("Only pending reminders can be snoozed.");
  }
  const baseTime = new Date(reminder.dueAt).getTime();
  const now = Date.now();
  const safeBaseTime = Number.isFinite(baseTime) ? baseTime : now;
  const nextDueAt = new Date(Math.max(safeBaseTime, now) + minutes * 60_000).toISOString();
  getDb().prepare("UPDATE reminders SET dueAt=@dueAt WHERE id=@id").run({ id, dueAt: nextDueAt });
}

function computeMsUntilNextReminderWake(): number {
  const row = getDb().prepare("SELECT dueAt FROM reminders WHERE status='pending' ORDER BY dueAt ASC LIMIT 1").get() as
    | { dueAt?: string }
    | undefined;
  if (!row?.dueAt) return REMINDER_SCHEDULER_SAFETY_INTERVAL_MS;
  const dueMs = new Date(row.dueAt).getTime();
  if (!Number.isFinite(dueMs)) return REMINDER_SCHEDULER_SAFETY_INTERVAL_MS;
  const delta = dueMs - Date.now();
  return Math.min(REMINDER_SCHEDULER_MAX_TIMER_MS, Math.max(REMINDER_SCHEDULER_MIN_TIMER_MS, delta + 25));
}

function runReminderSchedulerTick(getWindows: () => readonly (BrowserWindow | null)[]): boolean {
  const now = new Date().toISOString();
  const due = getDb()
    .prepare("SELECT * FROM reminders WHERE status='pending' AND dueAt <= @now ORDER BY dueAt ASC LIMIT @limit")
    .all({ now, limit: REMINDER_SCHEDULER_BATCH_LIMIT }) as Reminder[];
  let hasReminderChanges = false;
  let processedOk = 0;
  let failed = 0;
  for (const item of due) {
    try {
      const notification = new Notification({ title: "Reminder", body: item.text });
      notification.on("click", () => {
        for (const w of getWindows()) {
          if (w && !w.isDestroyed()) {
            showMainWindow(w);
            break;
          }
        }
      });
      notification.show();
      if (item.recurrence === "daily") {
        const sourceDue = new Date(item.dueAt);
        const next = Number.isNaN(sourceDue.getTime()) ? new Date(now) : sourceDue;
        const nowTime = Date.now();
        while (next.getTime() <= nowTime) {
          next.setDate(next.getDate() + 1);
        }
        getDb()
          .prepare("UPDATE reminders SET dueAt=@dueAt WHERE id=@id")
          .run({ id: item.id, dueAt: next.toISOString() });
      } else {
        completeReminder(item.id);
      }
      hasReminderChanges = true;
      processedOk += 1;
    } catch (error) {
      failed += 1;
      mainLog.warn(`Reminder scheduler failed for item ${item.id}: ${toErrorMessage(error)}`);
    }
  }
  if (due.length > 0) {
    mainLog.info(
      `[scheduler:reminders] tick dueSelected=${due.length} processedOk=${processedOk} failed=${failed} notifyBroadcast=${hasReminderChanges ? 1 : 0}`
    );
  }
  if (hasReminderChanges) {
    for (const w of getWindows()) {
      if (!w || w.isDestroyed() || w.webContents.isDestroyed()) continue;
      safeWebContentsSend(w.webContents, IpcRendererEvent.remindersUpdated);
    }
  }
  return hasReminderChanges;
}

/**
 * Wakes shortly before the next pending reminder (instead of a fixed 30s poll), with a
 * long-interval safety net while nothing is scheduled.
 */
export function startReminderScheduler(getWindows: () => readonly (BrowserWindow | null)[]): {
  stop: () => void;
} {
  mainLog.info("[scheduler:reminders] started");
  let isTickRunning = false;
  let wakeTimer: NodeJS.Timeout | undefined;

  const scheduleNextWake = (): void => {
    if (wakeTimer) clearTimeout(wakeTimer);
    const delay = computeMsUntilNextReminderWake();
    wakeTimer = setTimeout(() => {
      runDueCycle();
    }, delay);
    wakeTimer.unref();
  };

  const runDueCycle = (): void => {
    if (isTickRunning) return;
    isTickRunning = true;
    try {
      try {
        runReminderSchedulerTick(getWindows);
      } catch (error) {
        mainLog.error(`Reminder scheduler cycle failed: ${toErrorMessage(error)}`);
      }
      scheduleNextWake();
    } finally {
      isTickRunning = false;
    }
  };

  runDueCycle();

  const safety = setInterval(() => {
    runDueCycle();
  }, REMINDER_SCHEDULER_SAFETY_INTERVAL_MS);
  safety.unref();

  return {
    stop: () => {
      if (wakeTimer) clearTimeout(wakeTimer);
      clearInterval(safety);
      mainLog.info("[scheduler:reminders] stopped");
    }
  };
}

function validateId(id: string, resourceName: string): void {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(`${resourceName} ID is required.`);
  }
}

function normalizeReminderText(text: unknown): string {
  if (typeof text !== "string") throw new Error("Reminder text must be a string.");
  const normalized = text.trim();
  if (!normalized) throw new Error("Reminder text is required.");
  return normalized;
}

function normalizeIsoDate(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} must be a valid ISO date.`);
  }
  const date = new Date(trimmed);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date.`);
  }
  return date.toISOString();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapReminder(row: Record<string, unknown>): Reminder {
  const id = typeof row?.id === "string" && row.id.trim() ? row.id.trim() : "";
  if (!id) {
    throw new Error("Reminder row is missing a valid id (database may be corrupted).");
  }
  const normalizedStatus = row?.status === "done" ? "done" : "pending";
  const normalizedRecurrence = row?.recurrence === "daily" ? "daily" : "none";
  const fallbackDueAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const safeDueAt = normalizeIsoDateOrFallback(row?.dueAt, "Reminder dueAt", fallbackDueAt);
  const safeText = typeof row?.text === "string" ? row.text.trim() : "";
  return {
    id,
    text: safeText || "(empty reminder)",
    dueAt: safeDueAt,
    recurrence: normalizedRecurrence,
    status: normalizedStatus,
    notifyChannel: "desktop"
  };
}

function normalizeIsoDateOrFallback(value: unknown, fieldName: string, fallbackIso: string): string {
  try {
    return normalizeIsoDate(value, fieldName);
  } catch {
    return fallbackIso;
  }
}
