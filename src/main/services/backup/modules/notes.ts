import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const notesModule: BackupModule = {
  id: "notes",
  payloadKeys: ["notes"],

  exportData(db) {
    const notes = db.prepare("SELECT * FROM notes").all() as BackupPayload["notes"];
    return { notes };
  },

  ensureDefaults(payload) {
    if (!payload.notes) payload.notes = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM notes").run();
  },

  importData(db, payload) {
    const noteStmt = db.prepare(
      "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id, @title, @content, @tags, @pinned, @createdAt, @updatedAt)"
    );
    for (const row of payload.notes || []) {
      noteStmt.run(row);
    }
    return { notes: payload.notes?.length ?? 0 };
  },

  previewSection(payload) {
    const invalid = invalidArrayPreview(payload, "notes", "notes");
    if (invalid) return invalid;
    return { valid: true, counts: { notes: payload.notes?.length ?? 0 } };
  }
};
