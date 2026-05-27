import type { BackupModule, BackupPayload } from "../types";
import { invalidArrayPreview } from "../types";
import { isSecretSettingKey } from "../secrets";

export const settingsModule: BackupModule = {
  id: "settings",
  payloadKeys: ["app_settings"],

  exportData(db) {
    const allSettings = db.prepare("SELECT * FROM app_settings").all() as BackupPayload["app_settings"];
    const app_settings = (allSettings || []).filter((setting) => !isSecretSettingKey(setting.key));
    return { app_settings };
  },

  ensureDefaults(payload) {
    if (!payload.app_settings) payload.app_settings = [];
  },

  deleteAll(db) {
    db.prepare("DELETE FROM app_settings").run();
  },

  importData(db, payload, ctx) {
    let rejectedSecretSettings = ctx?.rejectedSecretSettings ?? 0;
    const settingStmt = db.prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)"
    );
    for (const row of payload.app_settings || []) {
      if (isSecretSettingKey(row.key)) {
        rejectedSecretSettings++;
        continue;
      }
      settingStmt.run(row);
    }
    if (ctx) {
      ctx.rejectedSecretSettings = rejectedSecretSettings;
    }
    return {
      app_settings: (payload.app_settings?.length ?? 0) - rejectedSecretSettings,
      rejected_secret_settings: rejectedSecretSettings
    };
  },

  previewSection(payload) {
    const invalid = invalidArrayPreview(payload, "app_settings", "app_settings");
    if (invalid) return invalid;
    return { valid: true, counts: { app_settings: payload.app_settings?.length ?? 0 } };
  }
};
