import { getErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useNoteActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  async function deleteNote(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete note "${title}"?`)) return;
    try {
      await window.assistantApi.deleteNote(id);
      setStatus("Memo removed.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
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
      await window.assistantApi.updateNote(payload);
      setStatus("Memo updated.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return { deleteNote, updateNote };
}
