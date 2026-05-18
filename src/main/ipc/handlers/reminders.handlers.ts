import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  completeReminder,
  createReminder,
  deleteReminder,
  listReminders,
  snoozeReminder,
  updateReminder
} from "../../services/reminders";
import { registerInvoke } from "../invoke-handle";
import { positiveIntegerSchema, reminderCreateSchema, reminderUpdateSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for listing, creating, completing, snoozing, and deleting reminders. */
export function registerRemindersHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.remindersList, assertSender, () => {
    return listReminders();
  });
  registerInvoke(IpcInvoke.remindersCreate, assertSender, (_event, payload) => {
    return createReminder(reminderCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.remindersUpdate, assertSender, (_event, payload) => {
    const parsed = reminderUpdateSchema.parse(payload);
    return updateReminder(parsed.id, { text: parsed.text, dueAt: parsed.dueAt });
  });
  registerInvoke(IpcInvoke.remindersComplete, assertSender, (_event, id) => {
    return completeReminder(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.remindersDelete, assertSender, (_event, id) => {
    return deleteReminder(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.remindersSnooze, assertSender, (_event, id, minutes) => {
    return snoozeReminder(uuidSchema.parse(id), positiveIntegerSchema.parse(minutes));
  });
}
