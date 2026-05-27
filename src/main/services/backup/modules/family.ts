import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const familyModule: BackupModule = {
  id: "family",
  payloadKeys: ["family_members", "family_occasions", "family_obligations"],

  exportData(db) {
    const family_members = db.prepare("SELECT * FROM family_members").all() as BackupPayload["family_members"];
    const family_occasions = db.prepare("SELECT * FROM family_occasions").all() as BackupPayload["family_occasions"];
    const family_obligations = db
      .prepare("SELECT * FROM family_obligations")
      .all() as BackupPayload["family_obligations"];
    return { family_members, family_occasions, family_obligations };
  },

  ensureDefaults(payload) {
    if (!payload.family_members) payload.family_members = [];
    if (!payload.family_occasions) payload.family_occasions = [];
    if (!payload.family_obligations) payload.family_obligations = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM family_obligations").run();
    db.prepare("DELETE FROM family_occasions").run();
    db.prepare("DELETE FROM family_members").run();
  },

  importData(db, payload) {
    const familyMemberStmt = db.prepare(
      "INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt) VALUES (@id, @name, @relationship, @phone, @email, @address, @preferredContactMethod, @notes, @isImportant, @createdAt, @updatedAt)"
    );
    for (const row of payload.family_members || []) {
      familyMemberStmt.run(row);
    }

    const familyOccasionStmt = db.prepare(
      "INSERT INTO family_occasions (id, memberId, type, title, date, recurrence, remindDaysBefore, lastAcknowledgedAt, notes, createdAt, updatedAt) VALUES (@id, @memberId, @type, @title, @date, @recurrence, @remindDaysBefore, @lastAcknowledgedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.family_occasions || []) {
      familyOccasionStmt.run(row);
    }

    const familyObligationStmt = db.prepare(
      "INSERT INTO family_obligations (id, memberId, occasionId, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt) VALUES (@id, @memberId, @occasionId, @type, @title, @dueAt, @status, @priority, @completedAt, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.family_obligations || []) {
      familyObligationStmt.run(row);
    }

    return {
      family_members: payload.family_members?.length ?? 0,
      family_occasions: payload.family_occasions?.length ?? 0,
      family_obligations: payload.family_obligations?.length ?? 0
    };
  },

  previewSection(payload) {
    const invalidMembers = invalidArrayPreview(payload, "family_members", "family_members");
    if (invalidMembers) return invalidMembers;
    const invalidOccasions = invalidArrayPreview(payload, "family_occasions", "family_occasions");
    if (invalidOccasions) return invalidOccasions;
    const invalidObligations = invalidArrayPreview(payload, "family_obligations", "family_obligations");
    if (invalidObligations) return invalidObligations;
    return {
      valid: true,
      counts: {
        family_members: payload.family_members?.length ?? 0,
        family_occasions: payload.family_occasions?.length ?? 0,
        family_obligations: payload.family_obligations?.length ?? 0
      }
    };
  }
};
