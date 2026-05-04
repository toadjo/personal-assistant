import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getAssistantSettings, saveAssistantName, saveUserPreferredName } from "../../services/settings";
import { registerInvoke } from "../invoke-handle";
import { assistantNameSchema, userPreferredNameSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for assistant display name and user preferred name settings. */
export function registerSettingsHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.settingsGetAssistant, assertSender, () => {
    return getAssistantSettings();
  });
  registerInvoke(IpcInvoke.settingsSetAssistantName, assertSender, (_event, name) => {
    return saveAssistantName(assistantNameSchema.parse(name));
  });
  registerInvoke(IpcInvoke.settingsSetUserPreferredName, assertSender, (_event, name) => {
    return saveUserPreferredName(userPreferredNameSchema.parse(name));
  });
}
