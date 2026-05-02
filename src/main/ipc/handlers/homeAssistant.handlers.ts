import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { getDb } from "../../db";
import {
  configureHomeAssistant,
  getHomeAssistantConfig,
  refreshEntities,
  testConnection,
  toggleEntity
} from "../../services/homeAssistant";
import { haConfigSchema, haEntityIdSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerHomeAssistantHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.haConfigure, (event, payload) => {
    assertSender(event);
    const parsed = haConfigSchema.parse(payload);
    return configureHomeAssistant(parsed.url, parsed.token);
  });
  ipcMain.handle(IpcInvoke.haGetConfig, (event) => {
    assertSender(event);
    return getHomeAssistantConfig();
  });
  ipcMain.handle(IpcInvoke.haTest, (event) => {
    assertSender(event);
    return testConnection();
  });
  ipcMain.handle(IpcInvoke.haRefresh, (event) => {
    assertSender(event);
    return refreshEntities();
  });
  ipcMain.handle(IpcInvoke.haToggle, (event, entityId) => {
    assertSender(event);
    return toggleEntity(haEntityIdSchema.parse(entityId));
  });
  ipcMain.handle(IpcInvoke.haListDevices, (event) => {
    assertSender(event);
    return getDb().prepare("SELECT * FROM devices_cache ORDER BY friendlyName ASC").all();
  });
}
