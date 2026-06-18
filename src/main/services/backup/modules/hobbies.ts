import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const hobbiesModule: BackupModule = {
  id: "hobbies",
  payloadKeys: ["hobbies", "hobby_sessions", "hobby_projects", "hobby_milestones", "hobby_supplies"],

  exportData(db) {
    const hobbies = db.prepare("SELECT * FROM hobbies").all() as BackupPayload["hobbies"];
    const hobby_sessions = db.prepare("SELECT * FROM hobby_sessions").all() as BackupPayload["hobby_sessions"];
    const hobby_projects = db.prepare("SELECT * FROM hobby_projects").all() as BackupPayload["hobby_projects"];
    const hobby_milestones = db.prepare("SELECT * FROM hobby_milestones").all() as BackupPayload["hobby_milestones"];
    const hobby_supplies = db.prepare("SELECT * FROM hobby_supplies").all() as BackupPayload["hobby_supplies"];
    return { hobbies, hobby_sessions, hobby_projects, hobby_milestones, hobby_supplies };
  },

  ensureDefaults(payload) {
    if (!payload.hobbies) payload.hobbies = [];
    if (!payload.hobby_sessions) payload.hobby_sessions = [];
    if (!payload.hobby_projects) payload.hobby_projects = [];
    if (!payload.hobby_milestones) payload.hobby_milestones = [];
    if (!payload.hobby_supplies) payload.hobby_supplies = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM hobby_supplies").run();
    db.prepare("DELETE FROM hobby_milestones").run();
    db.prepare("DELETE FROM hobby_projects").run();
    db.prepare("DELETE FROM hobby_sessions").run();
    db.prepare("DELETE FROM hobbies").run();
  },

  importData(db, payload) {
    const hobbyStmt = db.prepare(
      "INSERT INTO hobbies (id, name, category, description, status, createdAt, updatedAt) VALUES (@id, @name, @category, @description, @status, @createdAt, @updatedAt)"
    );
    for (const row of payload.hobbies || []) {
      hobbyStmt.run(row);
    }

    const hobbySessionStmt = db.prepare(
      "INSERT INTO hobby_sessions (id, hobbyId, date, durationMinutes, notes, mood, energy, progressRating, createdAt, updatedAt) VALUES (@id, @hobbyId, @date, @durationMinutes, @notes, @mood, @energy, @progressRating, @createdAt, @updatedAt)"
    );
    for (const row of payload.hobby_sessions || []) {
      hobbySessionStmt.run(row);
    }

    const hobbyProjectStmt = db.prepare(
      "INSERT INTO hobby_projects (id, hobbyId, name, description, status, targetDate, completedAt, createdAt, updatedAt) VALUES (@id, @hobbyId, @name, @description, @status, @targetDate, @completedAt, @createdAt, @updatedAt)"
    );
    for (const row of payload.hobby_projects || []) {
      hobbyProjectStmt.run(row);
    }

    const hobbyMilestoneStmt = db.prepare(
      "INSERT INTO hobby_milestones (id, projectId, name, description, targetDate, completedAt, createdAt, updatedAt) VALUES (@id, @projectId, @name, @description, @targetDate, @completedAt, @createdAt, @updatedAt)"
    );
    for (const row of payload.hobby_milestones || []) {
      hobbyMilestoneStmt.run(row);
    }

    const hobbySupplyStmt = db.prepare(
      "INSERT INTO hobby_supplies (id, hobbyId, projectId, name, type, cost, purchaseDate, source, notes, createdAt, updatedAt) VALUES (@id, @hobbyId, @projectId, @name, @type, @cost, @purchaseDate, @source, @notes, @createdAt, @updatedAt)"
    );
    for (const row of payload.hobby_supplies || []) {
      hobbySupplyStmt.run(row);
    }

    return {
      hobbies: payload.hobbies?.length ?? 0,
      hobby_sessions: payload.hobby_sessions?.length ?? 0,
      hobby_projects: payload.hobby_projects?.length ?? 0,
      hobby_milestones: payload.hobby_milestones?.length ?? 0,
      hobby_supplies: payload.hobby_supplies?.length ?? 0
    };
  },

  previewSection(payload) {
    const invalidHobbies = invalidArrayPreview(payload, "hobbies", "hobbies");
    if (invalidHobbies) return invalidHobbies;
    const invalidSessions = invalidArrayPreview(payload, "hobby_sessions", "hobby_sessions");
    if (invalidSessions) return invalidSessions;
    const invalidProjects = invalidArrayPreview(payload, "hobby_projects", "hobby_projects");
    if (invalidProjects) return invalidProjects;
    const invalidMilestones = invalidArrayPreview(payload, "hobby_milestones", "hobby_milestones");
    if (invalidMilestones) return invalidMilestones;
    const invalidSupplies = invalidArrayPreview(payload, "hobby_supplies", "hobby_supplies");
    if (invalidSupplies) return invalidSupplies;
    return {
      valid: true,
      counts: {
        hobbies: payload.hobbies?.length ?? 0,
        hobby_sessions: payload.hobby_sessions?.length ?? 0,
        hobby_projects: payload.hobby_projects?.length ?? 0,
        hobby_milestones: payload.hobby_milestones?.length ?? 0,
        hobby_supplies: payload.hobby_supplies?.length ?? 0
      }
    };
  }
};
