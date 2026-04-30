import { randomUUID } from "node:crypto";
import { BrowserWindow, Notification } from "electron";
import { getDb } from "../db";
import { Reminder } from "../../shared/types";

export function listReminders(): Reminder[] {
  return getDb().prepare("SELECT * FROM reminders ORDER BY dueAt ASC").all().map((row: any) => row as Reminder);
}

export function createReminder(input: Omit<Reminder, "id" | "status" | "notifyChannel">): Reminder {
  const reminder: Reminder = { id: randomUUID(), status: "pending", notifyChannel: "desktop", ...input };
  getDb()
    .prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id,@text,@dueAt,@recurrence,@status,@notifyChannel)"
    )
    .run(reminder);
  return reminder;
}

export function completeReminder(id: string): void {
  getDb().prepare("UPDATE reminders SET status='done' WHERE id=@id").run({ id });
}

export function deleteReminder(id: string): void {
  getDb().prepare("DELETE FROM reminders WHERE id=@id").run({ id });
}

export function snoozeReminder(id: string, minutes: number): void {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Snooze time must be a positive number of minutes.");
  }
  const reminder = getDb()
    .prepare("SELECT * FROM reminders WHERE id=@id")
    .get({ id }) as Reminder | undefined;
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

export function startReminderScheduler(mainWindow: BrowserWindow): NodeJS.Timeout {
  return setInterval(() => {
    const now = new Date().toISOString();
    const due = getDb()
      .prepare("SELECT * FROM reminders WHERE status='pending' AND dueAt <= @now ORDER BY dueAt ASC")
      .all({ now }) as Reminder[];
    for (const item of due) {
      try {
        new Notification({ title: "Reminder", body: item.text }).show();
        if (item.recurrence === "daily") {
          const sourceDue = new Date(item.dueAt);
          const next = Number.isNaN(sourceDue.getTime()) ? new Date(now) : sourceDue;
          next.setDate(next.getDate() + 1);
          getDb().prepare("UPDATE reminders SET dueAt=@dueAt WHERE id=@id").run({ id: item.id, dueAt: next.toISOString() });
        } else {
          completeReminder(item.id);
        }
      } catch (error) {
        // Keep scheduler alive even if notifications are unavailable on this host.
        console.error("Reminder scheduler failed for item", item.id, error);
      }
    }
    if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("reminders:updated");
    }
  }, 30_000);
}
