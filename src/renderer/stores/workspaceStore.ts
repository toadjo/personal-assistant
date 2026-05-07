import { create } from "zustand";
import type { AutomationRule, Note, Reminder, Task } from "../../shared/types";
import type { ExecutionLogRow, HaDeviceRow } from "../types";

/**
 * Fetched / cached desk data only (notes, reminders, HA devices, automation rows, search query, refresh flag).
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
  notes: Note[];
  reminders: Reminder[];
  tasks: Task[];
  devices: HaDeviceRow[];
  logs: ExecutionLogRow[];
  rules: AutomationRule[];
  isRefreshing: boolean;
  setQuery: (query: string) => void;
  setIsRefreshing: (value: boolean) => void;
  setFromFullRefresh: (payload: {
    notes: Note[];
    reminders: Reminder[];
    tasks: Task[];
    devices: HaDeviceRow[];
    logs: ExecutionLogRow[];
    rules: AutomationRule[];
  }) => void;
  setNotes: (value: Note[] | ((prev: Note[]) => Note[])) => void;
  setReminders: (value: Reminder[] | ((prev: Reminder[]) => Reminder[])) => void;
  setTasks: (value: Task[] | ((prev: Task[]) => Task[])) => void;
};

export const useWorkspaceStore = create<WorkspaceDataState>((set) => ({
  query: "",
  notes: [],
  reminders: [],
  tasks: [],
  devices: [],
  logs: [],
  rules: [],
  isRefreshing: true,
  setQuery: (query) => set({ query }),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  setFromFullRefresh: (payload) => set({ ...payload }),
  setNotes: (value: Note[] | ((prev: Note[]) => Note[])) =>
    set((s) => ({ notes: typeof value === "function" ? value(s.notes) : value })),
  setReminders: (value: Reminder[] | ((prev: Reminder[]) => Reminder[])) =>
    set((s) => ({ reminders: typeof value === "function" ? value(s.reminders) : value })),
  setTasks: (value: Task[] | ((prev: Task[]) => Task[])) =>
    set((s) => ({ tasks: typeof value === "function" ? value(s.tasks) : value }))
}));
