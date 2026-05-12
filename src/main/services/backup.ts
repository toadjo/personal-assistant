import { getDb } from "../db";

export type BackupPayload = {
  version: string;
  exportedAt: string;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    tags: string;
    pinned: number;
    createdAt: string;
    updatedAt: string;
  }>;
  reminders: Array<{
    id: string;
    text: string;
    dueAt: string;
    recurrence: string;
    status: string;
    notifyChannel: string;
  }>;
  tasks: Array<{
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
  automation_rules: Array<{
    id: string;
    name: string;
    triggerType: string;
    triggerConfig: string;
    actionType: string;
    actionConfig: string;
    enabled: number;
    lastFiredAt: string | null;
  }>;
  app_settings: Array<{
    key: string;
    value: string;
    updatedAt: string;
  }>;
};

export function exportBackup(): BackupPayload {
  const db = getDb();
  const notes = db.prepare("SELECT * FROM notes").all() as BackupPayload["notes"];
  const reminders = db.prepare("SELECT * FROM reminders").all() as BackupPayload["reminders"];
  const tasks = db.prepare("SELECT * FROM tasks").all() as BackupPayload["tasks"];
  const automation_rules = db.prepare("SELECT * FROM automation_rules").all() as BackupPayload["automation_rules"];
  const app_settings = db.prepare("SELECT * FROM app_settings").all() as BackupPayload["app_settings"];
  return {
    version: "1.7.0",
    exportedAt: new Date().toISOString(),
    notes,
    reminders,
    tasks,
    automation_rules,
    app_settings
  };
}

export function importBackup(payload: BackupPayload): {
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  app_settings: number;
} {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM notes").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM automation_rules").run();
    db.prepare("DELETE FROM app_settings").run();

    const noteStmt = db.prepare(
      "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id, @title, @content, @tags, @pinned, @createdAt, @updatedAt)"
    );
    for (const row of payload.notes) {
      noteStmt.run(row);
    }

    const reminderStmt = db.prepare(
      "INSERT INTO reminders (id, text, dueAt, recurrence, status, notifyChannel) VALUES (@id, @text, @dueAt, @recurrence, @status, @notifyChannel)"
    );
    for (const row of payload.reminders) {
      reminderStmt.run(row);
    }

    const taskStmt = db.prepare(
      "INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt) VALUES (@id, @title, @notes, @dueAt, @priority, @status, @recurrence, @notifyChannel, @createdAt, @updatedAt, @lastCompletedAt)"
    );
    for (const row of payload.tasks) {
      taskStmt.run(row);
    }

    const ruleStmt = db.prepare(
      "INSERT INTO automation_rules (id, name, triggerType, triggerConfig, actionType, actionConfig, enabled, lastFiredAt) VALUES (@id, @name, @triggerType, @triggerConfig, @actionType, @actionConfig, @enabled, @lastFiredAt)"
    );
    for (const row of payload.automation_rules) {
      ruleStmt.run(row);
    }

    const settingStmt = db.prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)"
    );
    for (const row of payload.app_settings) {
      settingStmt.run(row);
    }
  })();

  return {
    notes: payload.notes.length,
    reminders: payload.reminders.length,
    tasks: payload.tasks.length,
    automation_rules: payload.automation_rules.length,
    app_settings: payload.app_settings.length
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
