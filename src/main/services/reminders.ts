import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import { Notification } from "electron";
import { showMainWindow } from "../window";
import { IpcRendererEvent } from "../../shared/ipc-channels";
import { getDb } from "../db";
import { safeWebContentsSend } from "../ipc-safe-send";
import { mainLog } from "../log";
import { Reminder } from "../../shared/types";

const REMINDER_SCHEDULER_INTERVAL_MS = 30_000;
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

export function startReminderScheduler(getWindows: () => readonly (BrowserWindow | null)[]): NodeJS.Timeout {
  let isTickRunning = false;
  const interval = setInterval(() => {
    if (isTickRunning) return;
    isTickRunning = true;
    try {
      const now = new Date().toISOString();
      const due = getDb()
        .prepare("SELECT * FROM reminders WHERE status='pending' AND dueAt <= @now ORDER BY dueAt ASC LIMIT @limit")
        .all({ now, limit: REMINDER_SCHEDULER_BATCH_LIMIT }) as Reminder[];
      let hasReminderChanges = false;
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
            // If app was offline for multiple days, jump directly to the next future occurrence.
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
        } catch (error) {
          mainLog.warn(`Reminder scheduler failed for item ${item.id}: ${toErrorMessage(error)}`);
        }
      }
      if (hasReminderChanges) {
        for (const w of getWindows()) {
          if (!w || w.isDestroyed() || w.webContents.isDestroyed()) continue;
          safeWebContentsSend(w.webContents, IpcRendererEvent.remindersUpdated);
        }
      }
    } catch (error) {
      mainLog.error(`Reminder scheduler cycle failed: ${toErrorMessage(error)}`);
    } finally {
      isTickRunning = false;
    }
  }, REMINDER_SCHEDULER_INTERVAL_MS);
  interval.unref();
  return interval;
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
