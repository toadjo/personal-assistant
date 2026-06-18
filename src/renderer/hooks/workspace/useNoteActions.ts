import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "../../../shared/types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

type NoteActionHelpers = {
  mergeNote: (note: Note) => void;
  removeNoteById: (id: string) => void;
  refreshNotes: () => Promise<void>;
};

export function useNoteActions(setStatus: SetStatus, setError: SetError, helpers: NoteActionHelpers) {
  const { mergeNote, removeNoteById, refreshNotes } = helpers;
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
      pinned?: boolean;
    }) => requireAssistantApi().updateNote(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
      });
      const snapshots = queryClient.getQueriesData<Note[]>({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
      });
      queryClient.setQueriesData<Note[]>(
        {
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
        },
        (prev = []) => prev.map((note) => (note.id === payload.id ? { ...note, ...payload } : note))
      );
      return { snapshots };
    },
    onError: (err, _payload, context) => {
      for (const [key, value] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, value);
      }
      setError(getAssistantInvokeErrorMessage(err));
    },
    onSuccess: (updated) => {
      mergeNote(updated);
      setStatus("Memo updated.");
    },
    onSettled: async () => {
      await refreshNotes();
    }
  });

  async function deleteNote(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete note "${title}"?`)) return;
    const snapshots = queryClient.getQueriesData<Note[]>({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === workspaceQueryKeys.root[0] && q.queryKey[1] === "notes"
    });
    removeNoteById(id);
    try {
      const api = requireAssistantApi();
      await api.deleteNote(id);
      setStatus("Memo removed.");
      await refreshNotes();
    } catch (err) {
      for (const [key, value] of snapshots) {
        queryClient.setQueryData(key, value);
      }
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
      await updateMutation.mutateAsync(payload);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshNotes();
    }
  }

  return { deleteNote, updateNote };
}
