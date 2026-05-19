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
  remindersUpdate: "reminders:update",
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
  automationRulesDuplicate: "automation:rules:duplicate",
  automationRulesTestRun: "automation:rules:testRun",
  dataExport: "data:export",
  dataImport: "data:import",
  dataReset: "data:reset",
  rendererLogError: "renderer:logError",
  appOpenHouseholdWindow: "app:openHouseholdWindow",
  appFocusDeskWindow: "app:focusDeskWindow",
  appHideDeskWindow: "app:hideDeskWindow",
  appOpenBugReport: "app:openBugReport",
  testSetHaFetchOverride: "test:setHaFetchOverride",
  testSetAutomationActionOverride: "test:setAutomationActionOverride",
  teamGetConfig: "team:getConfig",
  teamSetConfig: "team:setConfig",
  teamSetDisplayName: "team:setDisplayName",
  teamClearConfig: "team:clearConfig",
  teamWorkspacesCreate: "team:workspaces:create",
  teamWorkspacesJoin: "team:workspaces:join",
  teamWorkspacesList: "team:workspaces:list",
  teamWorkspacesSetActive: "team:workspaces:setActive",
  teamProjectsCreate: "team:projects:create",
  teamProjectsList: "team:projects:list",
  teamTasksCreate: "team:tasks:create",
  teamTasksList: "team:tasks:list",
  teamTasksUpdate: "team:tasks:update",
  teamRealtimeStart: "team:realtime:start",
  teamRealtimeStop: "team:realtime:stop",
  aiGetConfig: "ai:getConfig",
  aiSetKey: "ai:setKey",
  aiClearKey: "ai:clearKey"
} as const;

/** Channels the main process pushes to the renderer (`webContents.send` / `ipcRenderer.on`). */
export const IpcRendererEvent = {
  remindersUpdated: "reminders:updated",
  command: "command",
  showAbout: "showAbout",
  teamDataUpdated: "team:dataUpdated"
} as const;
