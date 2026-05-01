import type { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { assertTrustedIpcSender } from "../security";
import { registerAutomationHandlers } from "./handlers/automation.handlers";
import { registerHomeAssistantHandlers } from "./handlers/homeAssistant.handlers";
import { registerNotesHandlers } from "./handlers/notes.handlers";
import { registerRemindersHandlers } from "./handlers/reminders.handlers";
import { registerSettingsHandlers } from "./handlers/settings.handlers";

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  const assertSender = (event: IpcMainInvokeEvent) => assertTrustedIpcSender(event, getMainWindow);

  registerNotesHandlers(assertSender);
  registerRemindersHandlers(assertSender);
  registerHomeAssistantHandlers(assertSender);
  registerSettingsHandlers(assertSender);
  registerAutomationHandlers(assertSender);
}
