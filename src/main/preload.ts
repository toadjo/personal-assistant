import { contextBridge, ipcRenderer } from "electron";

/**
 * Channel names are duplicated here on purpose: the preload script must only depend on
 * `electron`. Any `import` from the rest of the repo can fail at runtime (path/asar/CJS
 * resolution) and prevents `contextBridge.exposeInMainWorld` from running — leaving
 * `window.assistantApi` undefined.
 *
 * Keep in sync with `src/shared/ipc-channels.ts`.
 */
const invoke = {
  notesList: "notes:list",
  notesCreate: "notes:create",
  notesUpdate: "notes:update",
  notesDelete: "notes:delete",
  remindersList: "reminders:list",
  remindersCreate: "reminders:create",
  remindersComplete: "reminders:complete",
  remindersDelete: "reminders:delete",
  remindersSnooze: "reminders:snooze",
  haConfigure: "ha:configure",
  haGetConfig: "ha:getConfig",
  haTest: "ha:test",
  haRefresh: "ha:refresh",
  haListDevices: "ha:listDevices",
  haToggle: "ha:toggle",
  settingsGetAssistant: "settings:getAssistant",
  settingsSetAssistantName: "settings:setAssistantName",
  settingsSetUserPreferredName: "settings:setUserPreferredName",
  automationLogs: "automation:logs",
  automationRulesList: "automation:rules:list",
  automationRulesCreate: "automation:rules:create",
  automationRulesDelete: "automation:rules:delete",
  automationRulesSetEnabled: "automation:rules:setEnabled",
  rendererLogError: "renderer:logError",
  appOpenHouseholdWindow: "app:openHouseholdWindow",
  appFocusDeskWindow: "app:focusDeskWindow",
  appHideDeskWindow: "app:hideDeskWindow"
} as const;

const push = {
  remindersUpdated: "reminders:updated",
  command: "command"
} as const;

contextBridge.exposeInMainWorld("assistantApi", {
  listNotes: (query?: string) => ipcRenderer.invoke(invoke.notesList, query),
  createNote: (payload: { title: string; content: string; tags: string[]; pinned: boolean }) =>
    ipcRenderer.invoke(invoke.notesCreate, payload),
  updateNote: (payload: { id: string; title?: string; content?: string; tags?: string[]; pinned?: boolean }) =>
    ipcRenderer.invoke(invoke.notesUpdate, payload),
  deleteNote: (id: string) => ipcRenderer.invoke(invoke.notesDelete, id),
  listReminders: () => ipcRenderer.invoke(invoke.remindersList),
  createReminder: (payload: { text: string; dueAt: string; recurrence: "none" | "daily" }) =>
    ipcRenderer.invoke(invoke.remindersCreate, payload),
  completeReminder: (id: string) => ipcRenderer.invoke(invoke.remindersComplete, id),
  deleteReminder: (id: string) => ipcRenderer.invoke(invoke.remindersDelete, id),
  snoozeReminder: (id: string, minutes: number) => ipcRenderer.invoke(invoke.remindersSnooze, id, minutes),
  configureHomeAssistant: (payload: { url: string; token: string }) => ipcRenderer.invoke(invoke.haConfigure, payload),
  getHomeAssistantConfig: () => ipcRenderer.invoke(invoke.haGetConfig),
  testHomeAssistant: () => ipcRenderer.invoke(invoke.haTest),
  refreshHomeAssistantEntities: () => ipcRenderer.invoke(invoke.haRefresh),
  listDevices: () => ipcRenderer.invoke(invoke.haListDevices),
  toggleDevice: (entityId: string) => ipcRenderer.invoke(invoke.haToggle, entityId),
  getAssistantSettings: () => ipcRenderer.invoke(invoke.settingsGetAssistant),
  setAssistantName: (name: string) => ipcRenderer.invoke(invoke.settingsSetAssistantName, name),
  setUserPreferredName: (name: string) => ipcRenderer.invoke(invoke.settingsSetUserPreferredName, name),
  listExecutionLogs: () => ipcRenderer.invoke(invoke.automationLogs),
  listRules: () => ipcRenderer.invoke(invoke.automationRulesList),
  createRule: (
    payload: {
      name: string;
      triggerConfig: { at: string };
      enabled: boolean;
    } & (
      | { actionType: "localReminder"; actionConfig: { text: string } }
      | { actionType: "haToggle"; actionConfig: { entityId: string } }
    )
  ) => ipcRenderer.invoke(invoke.automationRulesCreate, payload),
  deleteRule: (id: string) => ipcRenderer.invoke(invoke.automationRulesDelete, id),
  setRuleEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke(invoke.automationRulesSetEnabled, { id, enabled }),
  logRendererError: (payload: { message: string; stack?: string; componentStack?: string }) =>
    ipcRenderer.invoke(invoke.rendererLogError, payload),
  onRemindersUpdated: (cb: () => void) => {
    ipcRenderer.on(push.remindersUpdated, cb);
    return () => ipcRenderer.removeListener(push.remindersUpdated, cb);
  },
  onCommand: (cb: (_: unknown, command: string) => void) => {
    ipcRenderer.on(push.command, cb);
    return () => ipcRenderer.removeListener(push.command, cb);
  },
  openHouseholdWindow: () => ipcRenderer.invoke(invoke.appOpenHouseholdWindow),
  focusDeskWindow: () => ipcRenderer.invoke(invoke.appFocusDeskWindow),
  hideDeskWindow: () => ipcRenderer.invoke(invoke.appHideDeskWindow)
});
