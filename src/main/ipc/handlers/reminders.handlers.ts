import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  completeReminder,
  createReminder,
  deleteReminder,
  listReminders,
  snoozeReminder
} from "../../services/reminders";
import { positiveIntegerSchema, reminderCreateSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerRemindersHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.remindersList, (event) => {
    assertSender(event);
    return listReminders();
  });
  ipcMain.handle(IpcInvoke.remindersCreate, (event, payload) => {
    assertSender(event);
    return createReminder(reminderCreateSchema.parse(payload));
  });
  ipcMain.handle(IpcInvoke.remindersComplete, (event, id) => {
    assertSender(event);
    return completeReminder(uuidSchema.parse(id));
  });
  ipcMain.handle(IpcInvoke.remindersDelete, (event, id) => {
    assertSender(event);
    return deleteReminder(uuidSchema.parse(id));
  });
  ipcMain.handle(IpcInvoke.remindersSnooze, (event, id, minutes) => {
    assertSender(event);
    return snoozeReminder(uuidSchema.parse(id), positiveIntegerSchema.parse(minutes));
  });
}
