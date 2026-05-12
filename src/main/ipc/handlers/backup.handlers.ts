import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import type { BackupPayload } from "../../services/backup";
import { exportBackup, importBackup, resetAllData } from "../../services/backup";
import { registerInvoke } from "../invoke-handle";

type AssertSender = (event: IpcMainInvokeEvent) => void;

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.version === "string" &&
    Array.isArray(o.notes) &&
    Array.isArray(o.reminders) &&
    Array.isArray(o.tasks) &&
    Array.isArray(o.automation_rules) &&
    Array.isArray(o.app_settings)
  );
}

export function registerBackupHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.dataExport, assertSender, () => {
    return exportBackup();
  });
  registerInvoke(IpcInvoke.dataImport, assertSender, (_event, payload) => {
    if (!isBackupPayload(payload)) {
      throw new Error("Invalid backup payload.");
    }
    return importBackup(payload);
  });
  registerInvoke(IpcInvoke.dataReset, assertSender, () => {
    resetAllData();
  });
}
