import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";

export const automationModule: BackupModule = {
  id: "automation",
  payloadKeys: ["automation_rules"],

  exportData(db) {
    const automation_rules = db.prepare("SELECT * FROM automation_rules").all() as BackupPayload["automation_rules"];
    return { automation_rules };
  },

  ensureDefaults(payload) {
    if (!payload.automation_rules) payload.automation_rules = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM automation_rules").run();
  },

  importData(db, payload) {
    const ruleStmt = db.prepare(
      "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled, lastFiredAt) VALUES (@id, @name, @triggerType, @triggerConfig, @actionType, @actionConfig, @enabled, @lastFiredAt)"
    );
    for (const row of payload.automation_rules || []) {
      ruleStmt.run(row);
    }
    return { automation_rules: payload.automation_rules?.length ?? 0 };
  },

  previewSection(payload) {
    const invalid = invalidArrayPreview(payload, "automation_rules", "automation_rules");
    if (invalid) return invalid;
    return { valid: true, counts: { automation_rules: payload.automation_rules?.length ?? 0 } };
  }
};
