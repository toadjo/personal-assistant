import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getAssistantSettings, saveAssistantName, saveUserPreferredName } from "../../services/settings";
import { assistantNameSchema, userPreferredNameSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerSettingsHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.settingsGetAssistant, (event) => {
    assertSender(event);
    return getAssistantSettings();
  });
  ipcMain.handle(IpcInvoke.settingsSetAssistantName, (event, name) => {
    assertSender(event);
    return saveAssistantName(assistantNameSchema.parse(name));
  });
  ipcMain.handle(IpcInvoke.settingsSetUserPreferredName, (event, name) => {
    assertSender(event);
    return saveUserPreferredName(userPreferredNameSchema.parse(name));
  });
}
