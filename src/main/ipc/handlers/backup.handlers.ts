import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { backupPayloadSchema } from "../schemas";
import { exportBackup, importBackup, previewBackup, resetAllData } from "../../services/backup";
import { checkDbHealth, optimizeDatabase } from "../../services/dbHealth";
import { checkBackupDiskSpace } from "../../services/diskSpace";
import { getAutoBackupStatus, setAutoBackupEnabled, runAutoBackup } from "../../services/autoBackup";
import { getOptimizeSuggestion } from "../../services/optimizeTracker";
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
  registerInvoke(IpcInvoke.dataImportPreview, assertSender, (_event, payload) => {
    if (!isBackupImportAllowed()) {
      throw new Error("Backup import is disabled by corporate policy.");
    }
    const parsed = backupPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid backup payload.");
    }
    return previewBackup(parsed.data);
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
  registerInvoke(IpcInvoke.dbHealthCheck, assertSender, () => {
    return checkDbHealth();
  });
  registerInvoke(IpcInvoke.dbOptimize, assertSender, () => {
    return optimizeDatabase();
  });
  registerInvoke(IpcInvoke.dbGetOptimizeSuggestion, assertSender, () => {
    return getOptimizeSuggestion();
  });
  registerInvoke(IpcInvoke.backupCheckDiskSpace, assertSender, () => {
    return checkBackupDiskSpace();
  });
  registerInvoke(IpcInvoke.autoBackupGetStatus, assertSender, () => {
    return getAutoBackupStatus();
  });
  registerInvoke(IpcInvoke.autoBackupSetEnabled, assertSender, (_event, ...args) => {
    const enabled = Boolean(args[0]);
    return setAutoBackupEnabled(enabled);
  });
  registerInvoke(IpcInvoke.autoBackupRunNow, assertSender, () => {
    return runAutoBackup();
  });
}
