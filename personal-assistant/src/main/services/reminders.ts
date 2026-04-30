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

export function startReminderScheduler(mainWindow: BrowserWindow): NodeJS.Timeout {
  return setInterval(() => {
    const now = new Date().toISOString();
    const due = getDb()
      .prepare("SELECT * FROM reminders WHERE status='pending' AND dueAt <= @now ORDER BY dueAt ASC")
      .all({ now }) as Reminder[];
    for (const item of due) {
      new Notification({ title: "Reminder", body: item.text }).show();
      if (item.recurrence === "daily") {
        const next = new Date(item.dueAt);
        next.setDate(next.getDate() + 1);
        getDb().prepare("UPDATE reminders SET dueAt=@dueAt WHERE id=@id").run({ id: item.id, dueAt: next.toISOString() });
      } else {
        completeReminder(item.id);
      }
    }
    mainWindow.webContents.send("reminders:updated");
  }, 30_000);
}
