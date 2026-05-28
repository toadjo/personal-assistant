import { create } from "zustand";

/**
 * Local renderer workspace state only.
 *
 * Ownership:
 * - This store owns ONLY fetched/cached workspace data and refresh state
 * - UI feedback (status, error messages) lives in useDeskUiState
 * - Transient command state (input, history, hints) lives in useDeskCommandState
 * - Onboarding state lives in useDeskUiState
 *
 * Mutation paths:
 * - All renderer-side writes to store data should flow through semantic helpers in useDeskDataState
 * - Prefer behavior helpers like mergeNote, removeNoteById over raw setNotes/setReminders
 * - This keeps mutation paths explicit and predictable
 */
export type WorkspaceDataState = {
  query: string;
  setQuery: (query: string) => void;
};

export const useWorkspaceStore = create<WorkspaceDataState>((set) => ({
  query: "",
  setQuery: (query) => set({ query })
}));
