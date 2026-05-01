import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { completeReminder, createReminder, deleteReminder, listReminders, snoozeReminder } from "../../services/reminders";
import { positiveIntegerSchema, reminderCreateSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerRemindersHandlers(assertSender: AssertSender): void {
  ipcMain.handle("reminders:list", (event) => {
    assertSender(event);
    return listReminders();
  });
  ipcMain.handle("reminders:create", (event, payload) => {
    assertSender(event);
    return createReminder(reminderCreateSchema.parse(payload));
  });
  ipcMain.handle("reminders:complete", (event, id) => {
    assertSender(event);
    return completeReminder(uuidSchema.parse(id));
  });
  ipcMain.handle("reminders:delete", (event, id) => {
    assertSender(event);
    return deleteReminder(uuidSchema.parse(id));
  });
  ipcMain.handle("reminders:snooze", (event, id, minutes) => {
    assertSender(event);
    return snoozeReminder(uuidSchema.parse(id), positiveIntegerSchema.parse(minutes));
  });
}
