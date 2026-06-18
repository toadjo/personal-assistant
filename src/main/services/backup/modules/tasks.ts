import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const tasksModule: BackupModule = {
  id: "tasks",
  payloadKeys: ["tasks"],

  exportData(db) {
    const tasks = db.prepare("SELECT * FROM tasks").all() as BackupPayload["tasks"];
    return { tasks };
  },

  ensureDefaults(payload) {
    if (!payload.tasks) payload.tasks = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM tasks").run();
  },

  importData(db, payload) {
    const taskStmt = db.prepare(
      "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (@id, @title, @notes, @dueAt, @priority, @status, @recurrence, @notifyChannel, @createdAt, @updatedAt, @lastCompletedAt)"
    );
    for (const row of payload.tasks || []) {
      taskStmt.run(row);
    }
    return { tasks: payload.tasks?.length ?? 0 };
  },

  previewSection(payload) {
    const invalid = invalidArrayPreview(payload, "tasks", "tasks");
    if (invalid) return invalid;
    return { valid: true, counts: { tasks: payload.tasks?.length ?? 0 } };
  }
};
