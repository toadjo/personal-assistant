import type { Note } from "../../../shared/types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

type NoteActionHelpers = {
  mergeNote: (note: Note) => void;
  removeNoteById: (id: string) => void;
  refreshNotes: () => Promise<void>;
};

export function useNoteActions(setStatus: SetStatus, setError: SetError, helpers: NoteActionHelpers) {
  const { mergeNote, removeNoteById, refreshNotes } = helpers;

  async function deleteNote(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete note "${title}"?`)) return;
    try {
      const api = requireAssistantApi();
      await api.deleteNote(id);
      removeNoteById(id);
      setStatus("Memo removed.");
      await refreshNotes();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshNotes();
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
      const api = requireAssistantApi();
      const updated = await api.updateNote(payload);
      mergeNote(updated);
      setStatus("Memo updated.");
      await refreshNotes();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshNotes();
    }
  }

  return { deleteNote, updateNote };
}
