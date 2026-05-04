/**
 * Data state composition hook.
 *
 * Ownership:
 * - Fetched/cached workspace entities (notes, reminders, devices, logs, rules)
 * - Query state
 * - Refresh flows (full refresh, notes-only, reminders-only)
 * - Optimistic update helpers (mergeNote, removeNoteById)
 *
 * Dependencies:
 * - setError: for reporting fetch errors
 *
 * This hook owns the Zustand-backed data layer and provides semantic helpers
 * for local optimistic updates. All renderer-side writes to store data should flow
 * through these helpers rather than raw store setters.
 */
import type { Note, Reminder, AutomationRule } from "../../../shared/types";
import type { ExecutionLogRow, HaDeviceRow } from "../../types";
import { useAssistantData } from "../data/useAssistantData";

export type DeskDataState = {
  query: string;
  setQuery: (value: string) => void;
  notes: Note[];
  reminders: Reminder[];
  devices: HaDeviceRow[];
  logs: ExecutionLogRow[];
  rules: AutomationRule[];
  isRefreshing: boolean;
  refreshAll: () => Promise<void>;
  fetchNotesOnly: () => Promise<void>;
  fetchRemindersOnly: () => Promise<void>;
  // Optimistic update helpers
  mergeNote: (note: Note) => void;
  removeNoteById: (id: string) => void;
};

export function useDeskDataState(setError: (message: string) => void): DeskDataState {
  const {
    query,
    setQuery,
    notes,
    reminders,
    devices,
    logs,
    rules,
    isRefreshing,
    refreshAll,
    fetchNotesOnly,
    fetchRemindersOnly,
    mergeNote,
    removeNoteById
  } = useAssistantData(setError);

  return {
    query,
    setQuery,
    notes,
    reminders,
    devices,
    logs,
    rules,
    isRefreshing,
    refreshAll,
    fetchNotesOnly,
    fetchRemindersOnly,
    mergeNote,
    removeNoteById
  };
}
