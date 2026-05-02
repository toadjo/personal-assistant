import { contextBridge, ipcRenderer } from "electron";
import { invokeChannelMap as invoke, pushChannelMap as push } from "./preload-ipc-literals.generated";

/**
 * Preload must only import `electron` plus this generated literal map (no `src/shared` import).
 * Channel strings are produced at build time from `src/shared/ipc-channels.ts` by
 * `scripts/generate-preload-ipc.mjs` (`npm run build:main` / `npm test`). Drift is also
 * asserted in `src/main/preload-channels.test.ts`.
 */
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
