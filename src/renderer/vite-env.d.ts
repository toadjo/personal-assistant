/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"1"`, enables renderer `devConsole*` output in production builds (for field diagnostics). */
  readonly VITE_RENDERER_DEBUG_CONSOLE?: string;
  /** Optional Sentry DSN for renderer process (set at build time). */
  readonly VITE_SENTRY_DSN?: string;
}

import type { AssistantSettings, AutomationRule, Note, Reminder } from "../shared/types";

declare global {
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
      completeReminder: (id: string) => Promise<void>;
      deleteReminder: (id: string) => Promise<void>;
      snoozeReminder: (id: string, minutes: number) => Promise<void>;
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
      logRendererError: (payload: { message: string; stack?: string; componentStack?: string }) => Promise<void>;
      onRemindersUpdated: (cb: () => void) => () => void;
      onCommand: (cb: (_event: unknown, command: string) => void) => () => void;
      openHouseholdWindow: () => Promise<boolean>;
      focusDeskWindow: () => Promise<boolean>;
      hideDeskWindow: () => Promise<boolean>;
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
    };
  }
}
