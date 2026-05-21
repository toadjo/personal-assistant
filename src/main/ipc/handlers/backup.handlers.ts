import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { backupPayloadSchema } from "../schemas";
import { exportBackup, importBackup, resetAllData } from "../../services/backup";
import { registerInvoke } from "../invoke-handle";
import { isBackupExportAllowed, isBackupImportAllowed } from "../../security/policy";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerBackupHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.dataExport, assertSender, () => {
    if (!isBackupExportAllowed()) {
      throw new Error("Backup export is disabled by corporate policy.");
    }
    return exportBackup();
  });
  registerInvoke(IpcInvoke.dataImport, assertSender, (_event, payload) => {
    if (!isBackupImportAllowed()) {
      throw new Error("Backup import is disabled by corporate policy.");
    }
    const parsed = backupPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid backup payload.");
    }
    return importBackup(parsed.data);
  });
  registerInvoke(IpcInvoke.dataReset, assertSender, () => {
    resetAllData();
  });
}
