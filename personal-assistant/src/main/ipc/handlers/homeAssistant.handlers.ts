import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { getDb } from "../../db";
import { configureHomeAssistant, getHomeAssistantConfig, refreshEntities, testConnection, toggleEntity } from "../../services/homeAssistant";
import { haConfigSchema, haEntityIdSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerHomeAssistantHandlers(assertSender: AssertSender): void {
  ipcMain.handle("ha:configure", (event, payload) => {
    assertSender(event);
    const parsed = haConfigSchema.parse(payload);
    return configureHomeAssistant(parsed.url, parsed.token);
  });
  ipcMain.handle("ha:getConfig", (event) => {
    assertSender(event);
    return getHomeAssistantConfig();
  });
  ipcMain.handle("ha:test", (event) => {
    assertSender(event);
    return testConnection();
  });
  ipcMain.handle("ha:refresh", (event) => {
    assertSender(event);
    return refreshEntities();
  });
  ipcMain.handle("ha:toggle", (event, entityId) => {
    assertSender(event);
    return toggleEntity(haEntityIdSchema.parse(entityId));
  });
  ipcMain.handle("ha:listDevices", (event) => {
    assertSender(event);
    return getDb().prepare("SELECT * FROM devices_cache ORDER BY friendlyName ASC").all();
  });
}
