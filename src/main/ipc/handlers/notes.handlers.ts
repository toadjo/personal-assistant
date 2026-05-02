import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { createNote, deleteNote, listNotes, updateNote } from "../../services/notes";
import { noteCreateSchema, noteUpdateSchema, optionalQuerySchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerNotesHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.notesList, (event, query) => {
    assertSender(event);
    return listNotes(optionalQuerySchema.parse(query));
  });
  ipcMain.handle(IpcInvoke.notesCreate, (event, payload) => {
    assertSender(event);
    return createNote(noteCreateSchema.parse(payload));
  });
  ipcMain.handle(IpcInvoke.notesUpdate, (event, payload) => {
    assertSender(event);
    return updateNote(noteUpdateSchema.parse(payload));
  });
  ipcMain.handle(IpcInvoke.notesDelete, (event, id) => {
    assertSender(event);
    return deleteNote(uuidSchema.parse(id));
  });
}
