import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { completeTask, createTask, deleteTask, listTasks, updateTask } from "../../services/tasks";
import { registerInvoke } from "../invoke-handle";
import { optionalQuerySchema, taskCreateSchema, taskUpdateSchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for listing, creating, updating, completing, and deleting tasks (trusted renderer only). */
export function registerTasksHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.tasksList, assertSender, (_event, query) => {
    return listTasks(optionalQuerySchema.parse(query));
  });
  registerInvoke(IpcInvoke.tasksCreate, assertSender, (_event, payload) => {
    return createTask(taskCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.tasksUpdate, assertSender, (_event, payload) => {
    return updateTask(taskUpdateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.tasksComplete, assertSender, (_event, id) => {
    return completeTask(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.tasksDelete, assertSender, (_event, id) => {
    deleteTask(uuidSchema.parse(id));
  });
}
