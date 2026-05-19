/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"1"`, enables renderer `devConsole*` output in production builds (for field diagnostics). */
  readonly VITE_RENDERER_DEBUG_CONSOLE?: string;
  /** Optional Sentry DSN for renderer process (set at build time). */
  readonly VITE_SENTRY_DSN?: string;
}

import type { AssistantSettings, AutomationRule, Note, Reminder, Task } from "../shared/types";
import type { TeamConfigStatus, TeamWorkspace, TeamProject, TeamProjectTask } from "../shared/team/types";
import type { AiConfigStatus, AiProvider, AiActionDraft } from "../shared/ai/types";

declare global {
  const __APP_VERSION__: string;

  interface Window {
    assistantApi: {
      listNotes: (query?: string) => Promise<Note[]>;
      createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) => Promise<Note>;
      updateNote: (payload: {
        id: string;
        title?: string;
        content?: string;
        tags?: string[];
        pinned?: boolean;
      }) => Promise<Note>;
      deleteNote: (id: string) => Promise<void>;
      listReminders: () => Promise<Reminder[]>;
      createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) => Promise<Reminder>;
      updateReminder: (payload: { id: string; text?: string; dueAt?: string }) => Promise<void>;
      completeReminder: (id: string) => Promise<void>;
      deleteReminder: (id: string) => Promise<void>;
      snoozeReminder: (id: string, minutes: number) => Promise<void>;
      listTasks: (query?: string) => Promise<Task[]>;
      createTask: (payload: {
        title: string;
        notes: string;
        dueAt: string | null;
        priority: "low" | "normal" | "high";
        recurrence: "none" | "daily" | "weekly" | "monthly";
      }) => Promise<Task>;
      updateTask: (payload: {
        id: string;
        title?: string;
        notes?: string;
        dueAt?: string | null;
        priority?: "low" | "normal" | "high";
        status?: "open" | "done";
        recurrence?: "none" | "daily" | "weekly" | "monthly";
      }) => Promise<Task>;
      completeTask: (id: string) => Promise<Task>;
      deleteTask: (id: string) => Promise<void>;
      configureHomeAssistant: (payload: { url: string; token: string }) => Promise<void>;
      getHomeAssistantConfig: () => Promise<{ url: string; hasToken: boolean }>;
      testHomeAssistant: () => Promise<boolean>;
      refreshHomeAssistantEntities: () => Promise<void>;
      listDevices: () => Promise<Array<{ entityId: string; friendlyName: string; state: string }>>;
      toggleDevice: (entityId: string) => Promise<void>;
      getAssistantSettings: () => Promise<AssistantSettings>;
      setAssistantName: (name: string) => Promise<AssistantSettings>;
      setUserPreferredName: (name: string) => Promise<AssistantSettings>;
      listExecutionLogs: () => Promise<
        Array<{
          id: string;
          ruleId: string;
          status: string;
          startedAt: string;
          endedAt: string;
          error?: string;
          attemptCount: number;
          retryCount: number;
          ruleName: string;
          actionLabel: string;
        }>
      >;
      listRules: () => Promise<AutomationRule[]>;
      createRule: (payload: Omit<AutomationRule, "id" | "triggerType">) => Promise<void>;
      deleteRule: (id: string) => Promise<void>;
      setRuleEnabled: (id: string, enabled: boolean) => Promise<void>;
      duplicateRule: (id: string) => Promise<AutomationRule>;
      testRunRule: (id: string) => Promise<void>;
      exportData: () => Promise<{
        version: string;
        exportedAt: string;
        notes: unknown[];
        reminders: unknown[];
        tasks: unknown[];
        automation_rules: unknown[];
        app_settings: unknown[];
      }>;
      importData: (payload: {
        version: string;
        exportedAt: string;
        notes: unknown[];
        reminders: unknown[];
        tasks: unknown[];
        automation_rules: unknown[];
        app_settings: unknown[];
      }) => Promise<{
        notes: number;
        reminders: number;
        tasks: number;
        automation_rules: number;
        app_settings: number;
      }>;
      resetData: () => Promise<void>;
      logRendererError: (payload: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
      onRemindersUpdated: (cb: () => void) => () => void;
      onCommand: (cb: (_event: unknown, command: string) => void) => () => void;
      onShowAbout: (cb: () => void) => () => void;
      openHouseholdWindow: () => Promise<boolean>;
      focusDeskWindow: () => Promise<boolean>;
      hideDeskWindow: () => Promise<boolean>;
      openBugReport: () => Promise<boolean>;
      /**
       * Test-only API: allows Electron E2E tests to inject a fake fetch implementation
       * to simulate Home Assistant failures without requiring a live server.
       * Only active when ELECTRON_E2E_TEST_MODE is set.
       */
      setTestHaFetchOverride: (
        config: { mode: "timeout" | "network_error" | "http_error"; status?: number } | null
      ) => Promise<void>;
      /**
       * Test-only API: allows Electron E2E tests to inject a fake automation action executor
       * to simulate timeout and failure modes without requiring real external services.
       * Only active when ELECTRON_E2E_TEST_MODE is set.
       */
      setTestAutomationActionOverride: (config: { mode: "timeout" | "failure" } | null) => Promise<void>;
      // Team mode operations
      teamSetConfig: (payload: { supabaseUrl: string; supabaseAnonKey: string; displayName: string }) => Promise<void>;
      teamSetDisplayName: (payload: { displayName: string }) => Promise<void>;
      teamGetConfig: () => Promise<TeamConfigStatus>;
      teamClearConfig: () => Promise<void>;
      teamWorkspacesCreate: (payload: { name: string }) => Promise<TeamWorkspace>;
      teamWorkspacesJoin: (payload: { workspaceKey: string }) => Promise<TeamWorkspace>;
      teamWorkspacesList: () => Promise<TeamWorkspace[]>;
      teamWorkspacesSetActive: (payload: { workspaceId: string | null }) => Promise<void>;
      teamProjectsCreate: (payload: { name: string }) => Promise<TeamProject>;
      teamProjectsList: () => Promise<TeamProject[]>;
      teamTasksCreate: (payload: {
        projectId: string;
        title: string;
        notes: string;
        dueAt: string | null;
        priority: "low" | "normal" | "high";
        recurrence: "none" | "daily" | "weekly" | "monthly";
        assigneeDisplayName: string | null;
      }) => Promise<TeamProjectTask>;
      teamTasksUpdate: (payload: {
        id: string;
        title?: string;
        notes?: string;
        dueAt?: string | null;
        priority?: "low" | "normal" | "high";
        status?: "open" | "done";
        recurrence?: "none" | "daily" | "weekly" | "monthly";
        assigneeDisplayName?: string | null;
      }) => Promise<TeamProjectTask>;
      teamTasksList: () => Promise<TeamProjectTask[]>;
      teamRealtimeStart: () => Promise<void>;
      teamRealtimeStop: () => Promise<void>;
      onTeamDataUpdated: (callback: (event: Electron.IpcRendererEvent, payload: { workspaceId: string; tables: Array<"projects" | "tasks"> }) => void) => () => void;
      // AI configuration (slice 1: storage + status only).
      getAiConfig: () => Promise<AiConfigStatus>;
      setAiKey: (payload: { provider: AiProvider; apiKey: string }) => Promise<AiConfigStatus>;
      clearAiKey: () => Promise<AiConfigStatus>;
      testAiKey: () => Promise<{ success: true; model: string }>;
      aiChat: (payload: { message: string; context?: { notesCount?: number; tasksCount?: number; remindersCount?: number; devicesCount?: number } }) => Promise<{ reply: string; actionDraft?: AiActionDraft }>;
    };
  }
}
