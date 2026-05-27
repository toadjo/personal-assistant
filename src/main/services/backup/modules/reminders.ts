import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const remindersModule: BackupModule = {
  id: "reminders",
  payloadKeys: ["reminders"],

  exportData(db) {
    const reminders = db.prepare("SELECT * FROM reminders").all() as BackupPayload["reminders"];
    return { reminders };
  },

  ensureDefaults(payload) {
    if (!payload.reminders) payload.reminders = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM reminders").run();
  },

  importData(db, payload) {
    const reminderStmt = db.prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id, @text, @dueAt, @recurrence, @status, @notifyChannel)"
    );
    for (const row of payload.reminders || []) {
      reminderStmt.run(row);
    }
    return { reminders: payload.reminders?.length ?? 0 };
  },

  previewSection(payload) {
    const invalid = invalidArrayPreview(payload, "reminders", "reminders");
    if (invalid) return invalid;
    return { valid: true, counts: { reminders: payload.reminders?.length ?? 0 } };
  }
};
