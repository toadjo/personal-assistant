/**
 * IPC invoke channel names (must match `ipcMain.handle` and `ipcRenderer.invoke`).
 *
 * **Preload:** literals are copied into `preload-ipc-literals.generated.ts` by
 * `scripts/generate-preload-ipc.mjs` (run from `build:main` / `test`). Preload imports that file
 * only (not this module) to avoid runtime resolution issues. After editing, run codegen or
 * `npm test` - `preload-channels.test.ts` asserts parity.
 */
export const IpcInvoke = {
  notesList: "notes:list",
  notesCreate: "notes:create",
  notesUpdate: "notes:update",
  notesDelete: "notes:delete",
  remindersList: "reminders:list",
  remindersCreate: "reminders:create",
  remindersComplete: "reminders:complete",
  remindersDelete: "reminders:delete",
  remindersSnooze: "reminders:snooze",
  tasksList: "tasks:list",
  tasksCreate: "tasks:create",
  tasksUpdate: "tasks:update",
  tasksComplete: "tasks:complete",
  tasksDelete: "tasks:delete",
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
  appHideDeskWindow: "app:hideDeskWindow",
  testSetHaFetchOverride: "test:setHaFetchOverride",
  testSetAutomationActionOverride: "test:setAutomationActionOverride"
} as const;

/** Channels the main process pushes to the renderer (`webContents.send` / `ipcRenderer.on`). */
export const IpcRendererEvent = {
  remindersUpdated: "reminders:updated",
  command: "command",
  showAbout: "showAbout"
} as const;
