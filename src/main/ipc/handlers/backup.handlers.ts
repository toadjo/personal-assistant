import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { backupPayloadSchema } from "../schemas";
import { exportBackup, importBackup, resetAllData } from "../../services/backup";
import { registerInvoke } from "../invoke-handle";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerBackupHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.dataExport, assertSender, () => {
    return exportBackup();
  });
  registerInvoke(IpcInvoke.dataImport, assertSender, (_event, payload) => {
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
