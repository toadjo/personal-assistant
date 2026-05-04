import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { createNote, deleteNote, listNotes, updateNote } from "../../services/notes";
import { registerInvoke } from "../invoke-handle";
import { noteCreateSchema, noteUpdateSchema, optionalQuerySchema, uuidSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for listing, creating, updating, and deleting notes (trusted renderer only). */
export function registerNotesHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.notesList, assertSender, (_event, query) => {
    return listNotes(optionalQuerySchema.parse(query));
  });
  registerInvoke(IpcInvoke.notesCreate, assertSender, (_event, payload) => {
    return createNote(noteCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.notesUpdate, assertSender, (_event, payload) => {
    return updateNote(noteUpdateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.notesDelete, assertSender, (_event, id) => {
    return deleteNote(uuidSchema.parse(id));
  });
}
