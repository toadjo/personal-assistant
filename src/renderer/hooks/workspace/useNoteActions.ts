import type { Note } from "../../../shared/types";
import { getErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

type NoteActionHelpers = {
  mergeNote: (note: Note) => void;
  removeNoteById: (id: string) => void;
  fetchNotesOnly: () => Promise<void>;
};

export function useNoteActions(setStatus: SetStatus, setError: SetError, helpers: NoteActionHelpers) {
  const { mergeNote, removeNoteById, fetchNotesOnly } = helpers;

  async function deleteNote(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete note "${title}"?`)) return;
    try {
      await window.assistantApi.deleteNote(id);
      removeNoteById(id);
      setStatus("Memo removed.");
      await fetchNotesOnly();
    } catch (err) {
      setError(getErrorMessage(err));
      await fetchNotesOnly();
    }
  }

  async function updateNote(payload: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
    pinned?: boolean;
  }): Promise<void> {
    try {
      const updated = await window.assistantApi.updateNote(payload);
      mergeNote(updated);
      setStatus("Memo updated.");
      await fetchNotesOnly();
    } catch (err) {
      setError(getErrorMessage(err));
      await fetchNotesOnly();
    }
  }

  return { deleteNote, updateNote };
}
