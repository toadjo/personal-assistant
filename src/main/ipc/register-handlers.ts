import type { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { assertTrustedIpcSender } from "../security";
import { registerAutomationHandlers } from "./handlers/automation.handlers";
import { registerHomeAssistantHandlers } from "./handlers/homeAssistant.handlers";
import { registerNotesHandlers } from "./handlers/notes.handlers";
import { registerRemindersHandlers } from "./handlers/reminders.handlers";
import { registerRendererHandlers } from "./handlers/renderer.handlers";
import { registerSettingsHandlers } from "./handlers/settings.handlers";

export function createAssertSender(getTrustedWindows: () => readonly (BrowserWindow | null)[]) {
  return (event: IpcMainInvokeEvent) => assertTrustedIpcSender(event, getTrustedWindows);
}

export function registerIpcHandlers(getTrustedWindows: () => readonly (BrowserWindow | null)[]): void {
  const assertSender = createAssertSender(getTrustedWindows);

  registerNotesHandlers(assertSender);
  registerRemindersHandlers(assertSender);
  registerHomeAssistantHandlers(assertSender);
  registerSettingsHandlers(assertSender);
  registerAutomationHandlers(assertSender);
  registerRendererHandlers(assertSender);
}
