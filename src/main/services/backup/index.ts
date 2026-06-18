import { app } from "electron";
import { getDb } from "../../db";
import { BACKUP_KNOWN_PAYLOAD_KEYS, BACKUP_MODULES } from "./registry";
import { decryptPayloadOrThrow, encryptPayload, isEncryptedPayload } from "./encryption";
import {
  BACKUP_METADATA_KEYS,
  emptyPreviewResult,
  type BackupExportOptions,
  type BackupImportOptions,
  type BackupImportContext,
  type BackupImportResult,
  type BackupPayload,
  type BackupPreviewResult
} from "./types";

export type {
  BackupPayload,
  BackupPreviewResult,
  BackupExportOptions,
  BackupImportOptions,
  BackupImportResult
} from "./types";

export function exportBackup(options?: BackupExportOptions): BackupPayload {
  const db = getDb();
  const payload: BackupPayload = {
    version: app.getVersion(),
    exportedAt: new Date().toISOString()
  };

  for (const module of BACKUP_MODULES) {
    Object.assign(payload, module.exportData(db));
  }

  return encryptPayload(payload, options?.encrypt);
}

export function previewBackup(payload: BackupPayload): BackupPreviewResult {
  if (!payload || typeof payload !== "object") {
    return emptyPreviewResult({
      valid: false,
      error: "Invalid backup: payload is not an object"
    });
  }

  if (isEncryptedPayload(payload)) {
    return emptyPreviewResult({
      valid: true,
      has_encrypted_content: true,
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    });
  }

  if (!payload.version || !payload.exportedAt) {
    return emptyPreviewResult({
      valid: false,
      error: "Invalid backup: missing version or exportedAt field",
      version: payload.version || "unknown",
      exportedAt: payload.exportedAt || "unknown"
    });
  }

  const mergedCounts: Partial<BackupPreviewResult> = {};
  for (const module of BACKUP_MODULES) {
    const section = module.previewSection(payload);
    if (!section.valid) {
      return emptyPreviewResult({
        valid: false,
        error: section.error,
        version: payload.version,
        exportedAt: payload.exportedAt
      });
    }
    Object.assign(mergedCounts, section.counts);
  }

  const knownFields = [...BACKUP_METADATA_KEYS, ...BACKUP_KNOWN_PAYLOAD_KEYS];
  const unsupported_sections: string[] = [];
  for (const key of Object.keys(payload)) {
    if (!knownFields.includes(key)) {
      unsupported_sections.push(key);
    }
  }

  return emptyPreviewResult({
    valid: true,
    ...mergedCounts,
    unsupported_sections,
    has_encrypted_content: false,
    version: payload.version,
    exportedAt: payload.exportedAt
  });
}

export function importBackup(payload: BackupPayload, _options?: BackupImportOptions): BackupImportResult {
  const actualPayload = decryptPayloadOrThrow(payload);

  for (const module of BACKUP_MODULES) {
    module.ensureDefaults(actualPayload);
  }

  const db = getDb();
  const ctx: BackupImportContext = { rejectedSecretSettings: 0 };

  db.transaction(() => {
    for (const module of [...BACKUP_MODULES].reverse()) {
      module.deleteAll(db);
    }

    for (const module of BACKUP_MODULES) {
      module.importData(db, actualPayload, ctx);
    }
  })();

  return {
    notes: actualPayload.notes?.length ?? 0,
    reminders: actualPayload.reminders?.length ?? 0,
    tasks: actualPayload.tasks?.length ?? 0,
    automation_rules: actualPayload.automation_rules?.length ?? 0,
    finance_bills: actualPayload.finance_bills?.length ?? 0,
    finance_expenses: actualPayload.finance_expenses?.length ?? 0,
    car_vehicles: actualPayload.car_vehicles?.length ?? 0,
    car_fuel_entries: actualPayload.car_fuel_entries?.length ?? 0,
    car_maintenance: actualPayload.car_maintenance?.length ?? 0,
    car_recurring_bills: actualPayload.car_recurring_bills?.length ?? 0,
    car_mileage: actualPayload.car_mileage?.length ?? 0,
    car_service_reminders: actualPayload.car_service_reminders?.length ?? 0,
    family_members: actualPayload.family_members?.length ?? 0,
    family_occasions: actualPayload.family_occasions?.length ?? 0,
    family_obligations: actualPayload.family_obligations?.length ?? 0,
    health_appointments: actualPayload.health_appointments?.length ?? 0,
    health_medications: actualPayload.health_medications?.length ?? 0,
    health_symptoms: actualPayload.health_symptoms?.length ?? 0,
    health_measurements: actualPayload.health_measurements?.length ?? 0,
    health_obligations: actualPayload.health_obligations?.length ?? 0,
    hobbies: actualPayload.hobbies?.length ?? 0,
    hobby_sessions: actualPayload.hobby_sessions?.length ?? 0,
    hobby_projects: actualPayload.hobby_projects?.length ?? 0,
    hobby_milestones: actualPayload.hobby_milestones?.length ?? 0,
    hobby_supplies: actualPayload.hobby_supplies?.length ?? 0,
    connected_accounts: actualPayload.connected_accounts?.length ?? 0,
    external_calendar_events: actualPayload.external_calendar_events?.length ?? 0,
    external_calendar_sync_state: actualPayload.external_calendar_sync_state?.length ?? 0,
    app_settings: (actualPayload.app_settings?.length ?? 0) - ctx.rejectedSecretSettings,
    rejected_secret_settings: ctx.rejectedSecretSettings
  };
}

export function resetAllData(): void {
  const db = getDb();
  db.transaction(() => {
    for (const module of [...BACKUP_MODULES].reverse()) {
      module.deleteAll(db);
    }
    db.prepare("DELETE FROM execution_logs").run();
    db.prepare("DELETE FROM renderer_errors").run();
    db.prepare("DELETE FROM devices_cache").run();
  })();
}
