import { app } from "electron";
import { getDb } from "../db";
import { encryptSecret, decryptSecret, SecureStorageUnavailableError } from "./secureSecrets";
import { isCorporateMode } from "../security/policy";

/**
 * Secret setting keys that should never be included in backups.
 */
const SECRET_SETTING_KEYS = ["ha.token", "ai.apiKey", "ai.provider", "ai.configured", "ai.lastTestedAt"] as const;

export type BackupPayload = {
  version: string;
  exportedAt: string;
  notes?: Array<{
    id: string;
    title: string;
    content: string;
    tags: string;
    pinned: number;
    createdAt: string;
    updatedAt: string;
  }>;
  reminders?: Array<{
    id: string;
    text: string;
    dueAt: string;
    recurrence: string;
    status: string;
    notifyChannel: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: string;
    status: string;
    recurrence: string;
    notifyChannel: string;
    createdAt: string;
    updatedAt: string;
    lastCompletedAt: string | null;
  }>;
  automation_rules?: Array<{
    id: string;
    name: string;
    triggerType: string;
    triggerConfig: string;
    actionType: string;
    actionConfig: string;
    enabled: number;
    lastFiredAt: string | null;
  }>;
  app_settings?: Array<{
    key: string;
    value: string;
    updatedAt: string;
  }>;
  _encrypted?: string;
};

export type BackupExportOptions = {
  encrypt?: boolean;
};

export type BackupImportOptions = {
  encrypted?: boolean;
};

export type BackupPreviewResult = {
  valid: boolean;
  error?: string;
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  app_settings: number;
  unsupported_sections: string[];
  has_encrypted_content: boolean;
  version: string;
  exportedAt: string;
};

export function exportBackup(options?: BackupExportOptions): BackupPayload {
  const db = getDb();
  const notes = db.prepare("SELECT * FROM notes").all() as BackupPayload["notes"];
  const reminders = db.prepare("SELECT * FROM reminders").all() as BackupPayload["reminders"];
  const tasks = db.prepare("SELECT * FROM tasks").all() as BackupPayload["tasks"];
  const automation_rules = db.prepare("SELECT * FROM automation_rules").all() as BackupPayload["automation_rules"];

  // Filter out secret settings from backup
  const allSettings = db.prepare("SELECT * FROM app_settings").all() as BackupPayload["app_settings"];
  const app_settings = (allSettings || []).filter(
    (setting) => !SECRET_SETTING_KEYS.includes(setting.key as (typeof SECRET_SETTING_KEYS)[number])
  );

  const payload: BackupPayload = {
    version: app.getVersion(),
    exportedAt: new Date().toISOString(),
    notes,
    reminders,
    tasks,
    automation_rules,
    app_settings
  };

  // In corporate mode, encrypt by default unless explicitly disabled
  const shouldEncrypt = options?.encrypt ?? isCorporateMode();
  if (shouldEncrypt) {
    try {
      const json = JSON.stringify(payload);
      const encrypted = encryptSecret(json);

      // When encrypted, return ONLY metadata + _encrypted, no plaintext arrays
      return {
        version: payload.version,
        exportedAt: payload.exportedAt,
        _encrypted: encrypted
      };
    } catch (error) {
      if (error instanceof SecureStorageUnavailableError) {
        // In corporate mode, fail closed when secure storage is unavailable
        if (isCorporateMode()) {
          throw new Error(
            "Corporate mode requires encrypted backup, but secure storage is unavailable. " +
              "Ensure your system supports safeStorage or enable encryption in your security settings."
          );
        }
        // In personal mode, fall back to unencrypted if secure storage is unavailable
        return payload;
      }
      throw error;
    }
  }

  return payload;
}

export function previewBackup(payload: BackupPayload): BackupPreviewResult {
  // Basic structure validation
  if (!payload || typeof payload !== "object") {
    return {
      valid: false,
      error: "Invalid backup: payload is not an object",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: "unknown",
      exportedAt: "unknown"
    };
  }

  // Check if encrypted
  const isEncrypted = payload._encrypted !== undefined && !payload.notes;
  if (isEncrypted) {
    // For encrypted backups, we can only show metadata
    return {
      valid: true,
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: true,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  // Validate required fields
  if (!payload.version || !payload.exportedAt) {
    return {
      valid: false,
      error: "Invalid backup: missing version or exportedAt field",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    };
  }

  // Validate data structure
  const unsupported_sections: string[] = [];

  if (payload.notes && !Array.isArray(payload.notes)) {
    return {
      valid: false,
      error: "Invalid backup: notes field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.reminders && !Array.isArray(payload.reminders)) {
    return {
      valid: false,
      error: "Invalid backup: reminders field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.tasks && !Array.isArray(payload.tasks)) {
    return {
      valid: false,
      error: "Invalid backup: tasks field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.automation_rules && !Array.isArray(payload.automation_rules)) {
    return {
      valid: false,
      error: "Invalid backup: automation_rules field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  if (payload.app_settings && !Array.isArray(payload.app_settings)) {
    return {
      valid: false,
      error: "Invalid backup: app_settings field is not an array",
      notes: 0,
      reminders: 0,
      tasks: 0,
      automation_rules: 0,
      app_settings: 0,
      unsupported_sections: [],
      has_encrypted_content: false,
      version: payload.version,
      exportedAt: payload.exportedAt
    };
  }

  // Check for unsupported fields
  const knownFields = [
    "version",
    "exportedAt",
    "notes",
    "reminders",
    "tasks",
    "automation_rules",
    "app_settings",
    "_encrypted"
  ];
  const payloadKeys = Object.keys(payload);
  for (const key of payloadKeys) {
    if (!knownFields.includes(key)) {
      unsupported_sections.push(key);
    }
  }

  // Count items that would be imported
  const notes = payload.notes?.length ?? 0;
  const reminders = payload.reminders?.length ?? 0;
  const tasks = payload.tasks?.length ?? 0;
  const automation_rules = payload.automation_rules?.length ?? 0;
  const app_settings = payload.app_settings?.length ?? 0;

  return {
    valid: true,
    notes,
    reminders,
    tasks,
    automation_rules,
    app_settings,
    unsupported_sections,
    has_encrypted_content: false,
    version: payload.version,
    exportedAt: payload.exportedAt
  };
}

export function importBackup(
  payload: BackupPayload,
  _options?: BackupImportOptions
): {
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  app_settings: number;
  rejected_secret_settings: number;
} {
  let actualPayload = payload;

  // Decrypt if payload is encrypted
  const isEncrypted = payload._encrypted !== undefined && !payload.notes;
  if (isEncrypted && payload._encrypted) {
    const decrypted = decryptSecret(payload._encrypted);
    if (!decrypted) {
      throw new Error("Failed to decrypt backup. The backup may be corrupted or was encrypted on a different system.");
    }
    try {
      actualPayload = JSON.parse(decrypted) as BackupPayload;
    } catch {
      throw new Error("Failed to parse decrypted backup. The backup may be corrupted.");
    }
  }

  // Ensure required fields exist after decryption
  if (!actualPayload.notes) actualPayload.notes = [];
  if (!actualPayload.reminders) actualPayload.reminders = [];
  if (!actualPayload.tasks) actualPayload.tasks = [];
  if (!actualPayload.automation_rules) actualPayload.automation_rules = [];
  if (!actualPayload.app_settings) actualPayload.app_settings = [];

  const db = getDb();
  let rejectedSecretSettings = 0;

  db.transaction(() => {
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM automation_rules").run();
    db.prepare("DELETE FROM app_settings").run();

    const noteStmt = db.prepare(
      "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id, @title, @content, @tags, @pinned, @createdAt, @updatedAt)"
    );
    for (const row of actualPayload.notes || []) {
      noteStmt.run(row);
    }

    const reminderStmt = db.prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id, @text, @dueAt, @recurrence, @status, @notifyChannel)"
    );
    for (const row of actualPayload.reminders || []) {
      reminderStmt.run(row);
    }

    const taskStmt = db.prepare(
      "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (@id, @title, @notes, @dueAt, @priority, @status, @recurrence, @notifyChannel, @createdAt, @updatedAt, @lastCompletedAt)"
    );
    for (const row of actualPayload.tasks || []) {
      taskStmt.run(row);
    }

    const ruleStmt = db.prepare(
      "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled, lastFiredAt) VALUES (@id, @name, @triggerType, @triggerConfig, @actionType, @actionConfig, @enabled, @lastFiredAt)"
    );
    for (const row of actualPayload.automation_rules || []) {
      ruleStmt.run(row);
    }

    const settingStmt = db.prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)"
    );
    for (const row of actualPayload.app_settings || []) {
      // Reject secret settings from import
      if (SECRET_SETTING_KEYS.includes(row.key as (typeof SECRET_SETTING_KEYS)[number])) {
        rejectedSecretSettings++;
        continue;
      }
      settingStmt.run(row);
    }
  })();

  return {
    notes: actualPayload.notes?.length ?? 0,
    reminders: actualPayload.reminders?.length ?? 0,
    tasks: actualPayload.tasks?.length ?? 0,
    automation_rules: actualPayload.automation_rules?.length ?? 0,
    app_settings: (actualPayload.app_settings?.length ?? 0) - rejectedSecretSettings,
    rejected_secret_settings: rejectedSecretSettings
  };
}

export function resetAllData(): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM automation_rules").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM execution_logs").run();
    db.prepare("DELETE FROM renderer_errors").run();
    db.prepare("DELETE FROM devices_cache").run();
  })();
}
