/**
 * IPC invoke channel names (must match `ipcMain.handle` and `ipcRenderer.invoke`).
 *
 * **Preload:** `src/main/preload.ts` duplicates these strings and must only import `electron`
 * so the bridge always registers. If you add a channel, update both files.
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

/** Channels the main process pushes to the renderer (`webContents.send` / `ipcRenderer.on`). */
export const IpcRendererEvent = {
  remindersUpdated: "reminders:updated",
  command: "command"
} as const;
