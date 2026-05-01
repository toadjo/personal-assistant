import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { getAssistantSettings, saveAssistantName } from "../../services/settings";
import { assistantNameSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerSettingsHandlers(assertSender: AssertSender): void {
  ipcMain.handle("settings:getAssistant", (event) => {
    assertSender(event);
    return getAssistantSettings();
  });
  ipcMain.handle("settings:setAssistantName", (event, name) => {
    assertSender(event);
    return saveAssistantName(assistantNameSchema.parse(name));
  });
}
