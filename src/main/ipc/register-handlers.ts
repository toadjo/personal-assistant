import type { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { assertTrustedIpcSender } from "../security";
import { registerAiHandlers } from "./handlers/ai.handlers";
import { registerAutomationHandlers } from "./handlers/automation.handlers";
import { registerBackupHandlers } from "./handlers/backup.handlers";
import { registerCarHandlers } from "./handlers/car.handlers";
import { registerFamilyHandlers } from "./handlers/family.handlers";
import { registerFinanceHandlers } from "./handlers/finance.handlers";
import { registerHomeAssistantHandlers } from "./handlers/homeAssistant.handlers";
import { registerNotesHandlers } from "./handlers/notes.handlers";
import { registerRemindersHandlers } from "./handlers/reminders.handlers";
import { registerRendererHandlers } from "./handlers/renderer.handlers";
import { registerSettingsHandlers } from "./handlers/settings.handlers";
import { registerTasksHandlers } from "./handlers/tasks.handlers";
import { registerTeamHandlers } from "./handlers/team.handlers";

export function createAssertSender(getTrustedWindows: () => readonly (BrowserWindow | null)[]) {
  return (event: IpcMainInvokeEvent) => assertTrustedIpcSender(event, getTrustedWindows);
}

/**
 * Wires `ipcMain.handle` for every `IpcInvoke` channel. Handlers use `registerInvoke` (`invoke-handle.ts`) so Zod
 * failures map to stable `ipc_validation` errors; payload shapes are listed in `handler-payload-contract.test.ts`.
 */
export function registerIpcHandlers(getTrustedWindows: () => readonly (BrowserWindow | null)[]): void {
  const assertSender = createAssertSender(getTrustedWindows);

  registerNotesHandlers(assertSender);
  registerRemindersHandlers(assertSender);
  registerTasksHandlers(assertSender);
  registerHomeAssistantHandlers(assertSender);
  registerSettingsHandlers(assertSender);
  registerAutomationHandlers(assertSender);
  registerBackupHandlers(assertSender);
  registerRendererHandlers(assertSender);
  registerTeamHandlers(assertSender);
  registerAiHandlers(assertSender);
  registerFinanceHandlers(assertSender);
  registerCarHandlers(assertSender);
  registerFamilyHandlers(assertSender);
}
