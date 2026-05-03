/* global window */
/**
 * Injected before the renderer bundle so Playwright can load the desk UI without Electron preload.
 * Keep in sync with `src/renderer/vite-env.d.ts` (`window.assistantApi`).
 */
(() => {
  const settings = {
    name: "Assistant",
    isConfigured: true,
    userPreferredName: "",
    userPreferredNameIsSet: false
  };

  window.assistantApi = {
    listNotes: async () => [],
    createNote: async (payload) => ({
      id: "stub-note",
      title: payload.title,
      content: payload.content,
      tags: payload.tags ?? [],
      pinned: payload.pinned ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    updateNote: async (payload) => ({
      id: payload.id,
      title: payload.title ?? "Untitled",
      content: payload.content ?? "",
      tags: payload.tags ?? [],
      pinned: payload.pinned ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    deleteNote: async () => {},
    listReminders: async () => [],
    createReminder: async (payload) => ({
      id: "stub-reminder",
      text: payload.text,
      dueAt: payload.dueAt,
      recurrence: payload.recurrence,
      status: "pending",
      notifyChannel: "desktop"
    }),
    completeReminder: async () => {},
    deleteReminder: async () => {},
    snoozeReminder: async () => {},
    configureHomeAssistant: async () => {},
    getHomeAssistantConfig: async () => ({ url: "", hasToken: false }),
    testHomeAssistant: async () => false,
    refreshHomeAssistantEntities: async () => {},
    listDevices: async () => [],
    toggleDevice: async () => {},
    getAssistantSettings: async () => ({ ...settings }),
    setAssistantName: async (name) => {
      settings.name = name;
      return { ...settings };
    },
    setUserPreferredName: async (name) => {
      const trimmed = String(name).trim();
      settings.userPreferredName = trimmed;
      settings.userPreferredNameIsSet = Boolean(trimmed);
      return { ...settings };
    },
    listExecutionLogs: async () => [],
    listRules: async () => [],
    createRule: async () => {},
    deleteRule: async () => {},
    setRuleEnabled: async () => {},
    logRendererError: async () => {},
    onRemindersUpdated: () => () => {},
    onCommand: () => () => {},
    openHouseholdWindow: async () => true,
    focusDeskWindow: async () => true,
    hideDeskWindow: async () => true
  };
})();
