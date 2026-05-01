import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { createNote, deleteNote, listNotes } from "../../services/notes";
import { noteCreateSchema, optionalQuerySchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerNotesHandlers(assertSender: AssertSender): void {
  ipcMain.handle("notes:list", (event, query) => {
    assertSender(event);
    return listNotes(optionalQuerySchema.parse(query));
  });
  ipcMain.handle("notes:create", (event, payload) => {
    assertSender(event);
    return createNote(noteCreateSchema.parse(payload));
  });
  ipcMain.handle("notes:delete", (event, id) => {
    assertSender(event);
    return deleteNote(uuidSchema.parse(id));
  });
}
