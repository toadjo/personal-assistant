/// <reference types="vite/client" />

import type { Note, Reminder } from "../shared/types";

declare global {
  interface Window {
    assistantApi: {
      listNotes: (query?: string) => Promise<Note[]>;
      createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) => Promise<Note>;
      listReminders: () => Promise<Reminder[]>;
      createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) => Promise<Reminder>;
      completeReminder: (id: string) => Promise<void>;
      configureHomeAssistant: (payload: { url: string; token: string }) => Promise<void>;
      testHomeAssistant: () => Promise<boolean>;
      refreshHomeAssistantEntities: () => Promise<void>;
      listDevices: () => Promise<Array<{ entityId: string; friendlyName: string; state: string }>>;
      toggleDevice: (entityId: string) => Promise<void>;
      listExecutionLogs: () => Promise<Array<{ id: string; status: string; startedAt: string; error?: string }>>;
      listRules: () => Promise<Array<{ id: string; name: string; triggerConfig: { at: string }; actionType: string }>>;
      createRule: (payload: {
        name: string;
        triggerConfig: { at: string };
        actionType: "localReminder" | "haToggle";
        actionConfig: Record<string, string>;
        enabled: boolean;
      }) => Promise<void>;
      onRemindersUpdated: (cb: () => void) => () => void;
    };
  }
}
