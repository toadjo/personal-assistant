import { create } from "zustand";
import type { AutomationRule, Note, Reminder } from "../../shared/types";
import type { ExecutionLogRow, HaDeviceRow } from "../types";

export type WorkspaceDataState = {
  query: string;
  notes: Note[];
  reminders: Reminder[];
  devices: HaDeviceRow[];
  logs: ExecutionLogRow[];
  rules: AutomationRule[];
  isRefreshing: boolean;
  setQuery: (query: string) => void;
  setIsRefreshing: (value: boolean) => void;
  setFromFullRefresh: (payload: {
    notes: Note[];
    reminders: Reminder[];
    devices: HaDeviceRow[];
    logs: ExecutionLogRow[];
    rules: AutomationRule[];
  }) => void;
  setNotes: (value: Note[] | ((prev: Note[]) => Note[])) => void;
  setReminders: (value: Reminder[] | ((prev: Reminder[]) => Reminder[])) => void;
};

export const useWorkspaceStore = create<WorkspaceDataState>((set) => ({
  query: "",
  notes: [],
  reminders: [],
  devices: [],
  logs: [],
  rules: [],
  isRefreshing: true,
  setQuery: (query) => set({ query }),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  setFromFullRefresh: (payload) => set({ ...payload }),
  setNotes: (value) =>
    set((s) => ({ notes: typeof value === "function" ? (value as (p: Note[]) => Note[])(s.notes) : value })),
  setReminders: (value) =>
    set((s) => ({
      reminders: typeof value === "function" ? (value as (p: Reminder[]) => Reminder[])(s.reminders) : value
    }))
}));
