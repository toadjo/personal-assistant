import { contextBridge, ipcRenderer } from "electron";

/**
 * Preload must be self-contained at runtime (no imports from local modules).
 * Channel strings are inlined below; they are also generated from
 * `src/shared/ipc-channels.ts` by `scripts/generate-preload-ipc.mjs`
 * for drift protection in `src/main/preload-channels.test.ts`.
 */
const invokeChannelMap = {
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
  settingsGetSecurityPolicy: "settings:getSecurityPolicy",
  connectedCalendarAccountsList: "connectedCalendar:accounts:list",
  connectedCalendarAccountsSummary: "connectedCalendar:accounts:summary",
  connectedCalendarAccountDisconnect: "connectedCalendar:accounts:disconnect",
  connectedCalendarEventsList: "connectedCalendar:events:list",
  connectedCalendarOAuthSetup: "connectedCalendar:oauth:setup",
  connectedCalendarOAuthStart: "connectedCalendar:oauth:start",
  connectedCalendarOAuthComplete: "connectedCalendar:oauth:complete",
  connectedCalendarAccountSync: "connectedCalendar:accounts:sync",
  connectedCalendarAccountsSyncAll: "connectedCalendar:accounts:syncAll",
  automationLogs: "automation:logs",
  automationRulesList: "automation:rules:list",
  automationRulesCreate: "automation:rules:create",
  automationRulesDelete: "automation:rules:delete",
  automationRulesSetEnabled: "automation:rules:setEnabled",
  automationRulesDuplicate: "automation:rules:duplicate",
  automationRulesTestRun: "automation:rules:testRun",
  dataExport: "data:export",
  dataImport: "data:import",
  dataImportPreview: "data:import:preview",
  dataReset: "data:reset",
  dbHealthCheck: "db:healthCheck",
  dbOptimize: "db:optimize",
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
  aiClearKey: "ai:clearKey",
  aiTestKey: "ai:testKey",
  aiChat: "ai:chat",
  financeBillsList: "finance:bills:list",
  financeBillsCreate: "finance:bills:create",
  financeBillsUpdate: "finance:bills:update",
  financeBillsDelete: "finance:bills:delete",
  financeBillsMarkPaid: "finance:bills:markPaid",
  financeExpensesList: "finance:expenses:list",
  financeExpensesCreate: "finance:expenses:create",
  financeExpensesUpdate: "finance:expenses:update",
  financeExpensesDelete: "finance:expenses:delete",
  financeSummaryGet: "finance:summary:get",
  carVehiclesList: "car:vehicles:list",
  carVehiclesCreate: "car:vehicles:create",
  carVehiclesUpdate: "car:vehicles:update",
  carVehiclesDelete: "car:vehicles:delete",
  carFuelList: "car:fuel:list",
  carFuelCreate: "car:fuel:create",
  carFuelUpdate: "car:fuel:update",
  carFuelDelete: "car:fuel:delete",
  carMaintenanceList: "car:maintenance:list",
  carMaintenanceCreate: "car:maintenance:create",
  carMaintenanceUpdate: "car:maintenance:update",
  carMaintenanceDelete: "car:maintenance:delete",
  carRecurringBillsList: "car:recurringBills:list",
  carRecurringBillsCreate: "car:recurringBills:create",
  carRecurringBillsUpdate: "car:recurringBills:update",
  carRecurringBillsMarkPaid: "car:recurringBills:markPaid",
  carRecurringBillsDelete: "car:recurringBills:delete",
  carMileageList: "car:mileage:list",
  carMileageCreate: "car:mileage:create",
  carMileageUpdate: "car:mileage:update",
  carMileageDelete: "car:mileage:delete",
  carServiceRemindersList: "car:serviceReminders:list",
  carServiceRemindersCreate: "car:serviceReminders:create",
  carServiceRemindersUpdate: "car:serviceReminders:update",
  carServiceRemindersComplete: "car:serviceReminders:complete",
  carServiceRemindersDelete: "car:serviceReminders:delete",
  familyMembersList: "family:members:list",
  familyMembersCreate: "family:members:create",
  familyMembersUpdate: "family:members:update",
  familyMembersDelete: "family:members:delete",
  familyOccasionsList: "family:occasions:list",
  familyOccasionsCreate: "family:occasions:create",
  familyOccasionsUpdate: "family:occasions:update",
  familyOccasionsDelete: "family:occasions:delete",
  familyObligationsList: "family:obligations:list",
  familyObligationsCreate: "family:obligations:create",
  familyObligationsUpdate: "family:obligations:update",
  familyObligationsComplete: "family:obligations:complete",
  familyObligationsDelete: "family:obligations:delete",
  familySummaryGet: "family:summary:get",
  healthAppointmentsList: "health:appointments:list",
  healthAppointmentsCreate: "health:appointments:create",
  healthAppointmentsUpdate: "health:appointments:update",
  healthAppointmentsDelete: "health:appointments:delete",
  healthMedicationsList: "health:medications:list",
  healthMedicationsCreate: "health:medications:create",
  healthMedicationsUpdate: "health:medications:update",
  healthMedicationsDelete: "health:medications:delete",
  healthSymptomsList: "health:symptoms:list",
  healthSymptomsCreate: "health:symptoms:create",
  healthSymptomsUpdate: "health:symptoms:update",
  healthSymptomsDelete: "health:symptoms:delete",
  healthMeasurementsList: "health:measurements:list",
  healthMeasurementsCreate: "health:measurements:create",
  healthMeasurementsUpdate: "health:measurements:update",
  healthMeasurementsDelete: "health:measurements:delete",
  healthObligationsList: "health:obligations:list",
  healthObligationsCreate: "health:obligations:create",
  healthObligationsUpdate: "health:obligations:update",
  healthObligationsComplete: "health:obligations:complete",
  healthObligationsDelete: "health:obligations:delete",
  healthSummaryGet: "health:summary:get",
  hobbiesList: "hobbies:list",
  hobbiesCreate: "hobbies:create",
  hobbiesUpdate: "hobbies:update",
  hobbiesDelete: "hobbies:delete",
  hobbySessionsList: "hobby:sessions:list",
  hobbySessionsCreate: "hobby:sessions:create",
  hobbySessionsUpdate: "hobby:sessions:update",
  hobbySessionsDelete: "hobby:sessions:delete",
  hobbyProjectsList: "hobby:projects:list",
  hobbyProjectsCreate: "hobby:projects:create",
  hobbyProjectsUpdate: "hobby:projects:update",
  hobbyProjectsComplete: "hobby:projects:complete",
  hobbyProjectsDelete: "hobby:projects:delete",
  hobbyMilestonesList: "hobby:milestones:list",
  hobbyMilestonesCreate: "hobby:milestones:create",
  hobbyMilestonesUpdate: "hobby:milestones:update",
  hobbyMilestonesComplete: "hobby:milestones:complete",
  hobbyMilestonesDelete: "hobby:milestones:delete",
  hobbySuppliesList: "hobby:supplies:list",
  hobbySuppliesCreate: "hobby:supplies:create",
  hobbySuppliesUpdate: "hobby:supplies:update",
  hobbySuppliesDelete: "hobby:supplies:delete",
  hobbiesSummaryGet: "hobbies:summary:get"
} as const;

const pushChannelMap = {
  remindersUpdated: "reminders:updated",
  command: "command",
  showAbout: "showAbout",
  teamDataUpdated: "team:dataUpdated"
} as const;

const invoke = invokeChannelMap;
const push = pushChannelMap;
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
  updateReminder: (payload: { id: string; text?: string; dueAt?: string }) =>
    ipcRenderer.invoke(invoke.remindersUpdate, payload),
  completeReminder: (id: string) => ipcRenderer.invoke(invoke.remindersComplete, id),
  deleteReminder: (id: string) => ipcRenderer.invoke(invoke.remindersDelete, id),
  snoozeReminder: (id: string, minutes: number) => ipcRenderer.invoke(invoke.remindersSnooze, id, minutes),
  listTasks: (query?: string) => ipcRenderer.invoke(invoke.tasksList, query),
  createTask: (payload: {
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
  }) => ipcRenderer.invoke(invoke.tasksCreate, payload),
  updateTask: (payload: {
    id: string;
    title?: string;
    notes?: string;
    dueAt?: string | null;
    priority?: "low" | "normal" | "high";
    status?: "open" | "done";
    recurrence?: "none" | "daily" | "weekly" | "monthly";
  }) => ipcRenderer.invoke(invoke.tasksUpdate, payload),
  completeTask: (id: string) => ipcRenderer.invoke(invoke.tasksComplete, id),
  deleteTask: (id: string) => ipcRenderer.invoke(invoke.tasksDelete, id),
  configureHomeAssistant: (payload: { url: string; token: string }) => ipcRenderer.invoke(invoke.haConfigure, payload),
  getHomeAssistantConfig: () => ipcRenderer.invoke(invoke.haGetConfig),
  testHomeAssistant: () => ipcRenderer.invoke(invoke.haTest),
  refreshHomeAssistantEntities: () => ipcRenderer.invoke(invoke.haRefresh),
  listDevices: () => ipcRenderer.invoke(invoke.haListDevices),
  toggleDevice: (entityId: string) => ipcRenderer.invoke(invoke.haToggle, entityId),
  getAssistantSettings: () => ipcRenderer.invoke(invoke.settingsGetAssistant),
  setAssistantName: (name: string) => ipcRenderer.invoke(invoke.settingsSetAssistantName, name),
  setUserPreferredName: (name: string) => ipcRenderer.invoke(invoke.settingsSetUserPreferredName, name),
  listConnectedCalendarAccounts: () => ipcRenderer.invoke(invoke.connectedCalendarAccountsList),
  getConnectedCalendarAccountsSummary: () => ipcRenderer.invoke(invoke.connectedCalendarAccountsSummary),
  getConnectedCalendarOAuthSetup: () => ipcRenderer.invoke(invoke.connectedCalendarOAuthSetup),
  disconnectConnectedCalendarAccount: (accountId: string) =>
    ipcRenderer.invoke(invoke.connectedCalendarAccountDisconnect, accountId),
  listExternalCalendarEvents: (payload: {
    startAt: string;
    endAt: string;
    provider?: "google" | "microsoft";
    accountId?: string;
  }) => ipcRenderer.invoke(invoke.connectedCalendarEventsList, payload),
  startConnectedCalendarOAuth: (payload: { provider: "google" | "microsoft" }) =>
    ipcRenderer.invoke(invoke.connectedCalendarOAuthStart, payload),
  completeConnectedCalendarOAuth: (payload: { provider: "google" | "microsoft" }) =>
    ipcRenderer.invoke(invoke.connectedCalendarOAuthComplete, payload),
  syncConnectedCalendarAccount: (payload: { accountId: string }) =>
    ipcRenderer.invoke(invoke.connectedCalendarAccountSync, payload),
  syncAllConnectedCalendarAccounts: () => ipcRenderer.invoke(invoke.connectedCalendarAccountsSyncAll),
  listExecutionLogs: () => ipcRenderer.invoke(invoke.automationLogs),
  listRules: () => ipcRenderer.invoke(invoke.automationRulesList),
  createRule: (
    payload: {
      name: string;
      triggerConfig: { at: string };
      enabled: boolean;
    } & (
      | { actionType: "localReminder"; actionConfig: { text: string } }
      | {
          actionType: "localTask";
          actionConfig: {
            title: string;
            notes: string;
            dueAt: string | null;
            priority: "low" | "normal" | "high";
            recurrence: "none" | "daily" | "weekly" | "monthly";
          };
        }
      | { actionType: "haToggle"; actionConfig: { entityId: string } }
    )
  ) => ipcRenderer.invoke(invoke.automationRulesCreate, payload),
  deleteRule: (id: string) => ipcRenderer.invoke(invoke.automationRulesDelete, id),
  setRuleEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke(invoke.automationRulesSetEnabled, { id, enabled }),
  duplicateRule: (id: string) => ipcRenderer.invoke(invoke.automationRulesDuplicate, id),
  testRunRule: (id: string) => ipcRenderer.invoke(invoke.automationRulesTestRun, id),
  exportData: () => ipcRenderer.invoke(invoke.dataExport),
  importData: (payload: {
    version: string;
    exportedAt: string;
    notes: unknown[];
    reminders: unknown[];
    tasks: unknown[];
    automation_rules: unknown[];
    app_settings: unknown[];
  }) => ipcRenderer.invoke(invoke.dataImport, payload),
  previewImportData: (payload: {
    version: string;
    exportedAt: string;
    notes: unknown[];
    reminders: unknown[];
    tasks: unknown[];
    automation_rules: unknown[];
    app_settings: unknown[];
  }) => ipcRenderer.invoke(invoke.dataImportPreview, payload),
  resetData: () => ipcRenderer.invoke(invoke.dataReset),
  checkDbHealth: () => ipcRenderer.invoke(invoke.dbHealthCheck),
  optimizeDatabase: () => ipcRenderer.invoke(invoke.dbOptimize),
  logRendererError: (payload: { message: string; stack?: string; componentStack?: string }) =>
    ipcRenderer.invoke(invoke.rendererLogError, payload),
  onRemindersUpdated: (cb: () => void) => {
    ipcRenderer.on(push.remindersUpdated, cb);
    return () => ipcRenderer.removeListener(push.remindersUpdated, cb);
  },
  onCommand: (cb: (_event: unknown, command: string) => void) => {
    ipcRenderer.on(push.command, cb);
    return () => ipcRenderer.removeListener(push.command, cb);
  },
  onShowAbout: (cb: () => void) => {
    ipcRenderer.on(push.showAbout, cb);
    return () => ipcRenderer.removeListener(push.showAbout, cb);
  },
  openHouseholdWindow: () => ipcRenderer.invoke(invoke.appOpenHouseholdWindow),
  focusDeskWindow: () => ipcRenderer.invoke(invoke.appFocusDeskWindow),
  hideDeskWindow: () => ipcRenderer.invoke(invoke.appHideDeskWindow),
  openBugReport: () => ipcRenderer.invoke(invoke.appOpenBugReport),
  /**
   * Test-only API: allows Electron E2E tests to inject a fake fetch implementation
   * to simulate Home Assistant failures without requiring a live server.
   * Only active when ELECTRON_E2E_TEST_MODE is set.
   */
  setTestHaFetchOverride: (config: { mode: "timeout" | "network_error" | "http_error"; status?: number } | null) =>
    ipcRenderer.invoke(invoke.testSetHaFetchOverride, config),
  /**
   * Test-only API: allows Electron E2E tests to inject a fake automation action executor
   * to simulate timeout and failure modes without requiring real external services.
   * Only active when ELECTRON_E2E_TEST_MODE is set.
   */
  setTestAutomationActionOverride: (config: { mode: "timeout" | "failure" } | null) =>
    ipcRenderer.invoke(invoke.testSetAutomationActionOverride, config),
  // Team mode operations
  teamSetConfig: (payload: { supabaseUrl: string; supabaseAnonKey: string; displayName: string }) =>
    ipcRenderer.invoke(invoke.teamSetConfig, payload),
  teamSetDisplayName: (payload: { displayName: string }) => ipcRenderer.invoke(invoke.teamSetDisplayName, payload),
  teamGetConfig: () => ipcRenderer.invoke(invoke.teamGetConfig),
  teamClearConfig: () => ipcRenderer.invoke(invoke.teamClearConfig),
  teamWorkspacesCreate: (payload: { name: string }) => ipcRenderer.invoke(invoke.teamWorkspacesCreate, payload),
  teamWorkspacesJoin: (payload: { workspaceKey: string }) => ipcRenderer.invoke(invoke.teamWorkspacesJoin, payload),
  teamWorkspacesList: () => ipcRenderer.invoke(invoke.teamWorkspacesList),
  teamWorkspacesSetActive: (payload: { workspaceId: string | null }) =>
    ipcRenderer.invoke(invoke.teamWorkspacesSetActive, payload),
  teamProjectsCreate: (payload: { name: string }) => ipcRenderer.invoke(invoke.teamProjectsCreate, payload),
  teamProjectsList: () => ipcRenderer.invoke(invoke.teamProjectsList),
  teamTasksCreate: (payload: {
    projectId: string;
    title: string;
    notes: string;
    dueAt: string | null;
    priority: "low" | "normal" | "high";
    recurrence: "none" | "daily" | "weekly" | "monthly";
    assigneeDisplayName: string | null;
  }) => ipcRenderer.invoke(invoke.teamTasksCreate, payload),
  teamTasksUpdate: (payload: {
    id: string;
    title?: string;
    notes?: string;
    dueAt?: string | null;
    priority?: "low" | "normal" | "high";
    status?: "open" | "done";
    recurrence?: "none" | "daily" | "weekly" | "monthly";
    assigneeDisplayName?: string | null;
  }) => ipcRenderer.invoke(invoke.teamTasksUpdate, payload),
  teamTasksList: () => ipcRenderer.invoke(invoke.teamTasksList),
  teamRealtimeStart: () => ipcRenderer.invoke(invoke.teamRealtimeStart),
  teamRealtimeStop: () => ipcRenderer.invoke(invoke.teamRealtimeStop),
  onTeamDataUpdated: (cb: (...args: unknown[]) => void) => {
    ipcRenderer.on(push.teamDataUpdated, cb);
    return () => ipcRenderer.removeListener(push.teamDataUpdated, cb);
  },
  // AI configuration (slice 1: storage + status only, no provider calls).
  // Raw API keys never cross the bridge: setAiKey takes the key in, no getter ever returns it.
  getAiConfig: () => ipcRenderer.invoke(invoke.aiGetConfig),
  setAiKey: (payload: { provider: "openai" | "anthropic"; apiKey: string }) =>
    ipcRenderer.invoke(invoke.aiSetKey, payload),
  clearAiKey: () => ipcRenderer.invoke(invoke.aiClearKey),
  testAiKey: () => ipcRenderer.invoke(invoke.aiTestKey),
  aiChat: (payload: {
    message: string;
    context?: { notesCount?: number; tasksCount?: number; remindersCount?: number; devicesCount?: number };
  }) => ipcRenderer.invoke(invoke.aiChat, payload),
  // Family operations
  listFamilyMembers: () => ipcRenderer.invoke(invoke.familyMembersList),
  createFamilyMember: (payload: {
    name: string;
    relationship: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    preferredContactMethod?: string;
    notes?: string;
    isImportant?: number;
  }) => ipcRenderer.invoke(invoke.familyMembersCreate, payload),
  updateFamilyMember: (payload: {
    id: string;
    name?: string;
    relationship?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    preferredContactMethod?: string;
    notes?: string;
    isImportant?: number;
  }) => ipcRenderer.invoke(invoke.familyMembersUpdate, payload),
  deleteFamilyMember: (id: string) => ipcRenderer.invoke(invoke.familyMembersDelete, id),
  listFamilyOccasions: (memberId?: string) => ipcRenderer.invoke(invoke.familyOccasionsList, memberId),
  createFamilyOccasion: (payload: {
    memberId: string;
    type: "birthday" | "name_day" | "anniversary" | "memorial" | "custom";
    title: string;
    date: string;
    recurrence?: string;
    remindDaysBefore?: number;
    lastAcknowledgedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.familyOccasionsCreate, payload),
  updateFamilyOccasion: (payload: {
    id: string;
    memberId?: string;
    type?: "birthday" | "name_day" | "anniversary" | "memorial" | "custom";
    title?: string;
    date?: string;
    recurrence?: string;
    remindDaysBefore?: number;
    lastAcknowledgedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.familyOccasionsUpdate, payload),
  deleteFamilyOccasion: (id: string) => ipcRenderer.invoke(invoke.familyOccasionsDelete, id),
  listFamilyObligations: (memberId?: string) => ipcRenderer.invoke(invoke.familyObligationsList, memberId),
  createFamilyObligation: (payload: {
    memberId: string;
    occasionId?: string | null;
    type: "call" | "visit" | "message" | "gift" | "paperwork" | "custom";
    title: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.familyObligationsCreate, payload),
  updateFamilyObligation: (payload: {
    id: string;
    memberId?: string;
    occasionId?: string | null;
    type?: "call" | "visit" | "message" | "gift" | "paperwork" | "custom";
    title?: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.familyObligationsUpdate, payload),
  completeFamilyObligation: (id: string) => ipcRenderer.invoke(invoke.familyObligationsComplete, id),
  deleteFamilyObligation: (id: string) => ipcRenderer.invoke(invoke.familyObligationsDelete, id),
  getFamilySummary: () => ipcRenderer.invoke(invoke.familySummaryGet),

  // Health operations
  listHealthAppointments: () => ipcRenderer.invoke(invoke.healthAppointmentsList),
  createHealthAppointment: (payload: {
    type: "checkup" | "specialist" | "emergency" | "followup" | "procedure" | "custom";
    title: string;
    provider?: string | null;
    location?: string | null;
    date: string;
    time: string;
    duration: number;
    status?: "scheduled" | "completed" | "cancelled" | "missed";
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthAppointmentsCreate, payload),
  updateHealthAppointment: (payload: {
    id: string;
    type?: "checkup" | "specialist" | "emergency" | "followup" | "procedure" | "custom";
    title?: string;
    provider?: string | null;
    location?: string | null;
    date?: string;
    time?: string;
    duration?: number;
    status?: "scheduled" | "completed" | "cancelled" | "missed";
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthAppointmentsUpdate, payload),
  deleteHealthAppointment: (id: string) => ipcRenderer.invoke(invoke.healthAppointmentsDelete, id),
  listHealthMedications: () => ipcRenderer.invoke(invoke.healthMedicationsList),
  createHealthMedication: (payload: {
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    status?: "active" | "discontinued" | "completed";
    startDate: string;
    endDate?: string | null;
    prescriber?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthMedicationsCreate, payload),
  updateHealthMedication: (payload: {
    id: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    status?: "active" | "discontinued" | "completed";
    startDate?: string;
    endDate?: string | null;
    prescriber?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthMedicationsUpdate, payload),
  deleteHealthMedication: (id: string) => ipcRenderer.invoke(invoke.healthMedicationsDelete, id),
  listHealthSymptoms: () => ipcRenderer.invoke(invoke.healthSymptomsList),
  createHealthSymptom: (payload: {
    name: string;
    severity: "mild" | "moderate" | "severe";
    startDate: string;
    endDate?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthSymptomsCreate, payload),
  updateHealthSymptom: (payload: {
    id: string;
    name?: string;
    severity?: "mild" | "moderate" | "severe";
    startDate?: string;
    endDate?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthSymptomsUpdate, payload),
  deleteHealthSymptom: (id: string) => ipcRenderer.invoke(invoke.healthSymptomsDelete, id),
  listHealthMeasurements: () => ipcRenderer.invoke(invoke.healthMeasurementsList),
  createHealthMeasurement: (payload: {
    type: "weight" | "blood_pressure" | "heart_rate" | "temperature" | "blood_sugar" | "custom";
    value: string;
    unit: string;
    date: string;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthMeasurementsCreate, payload),
  updateHealthMeasurement: (payload: {
    id: string;
    type?: "weight" | "blood_pressure" | "heart_rate" | "temperature" | "blood_sugar" | "custom";
    value?: string;
    unit?: string;
    date?: string;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthMeasurementsUpdate, payload),
  deleteHealthMeasurement: (id: string) => ipcRenderer.invoke(invoke.healthMeasurementsDelete, id),
  listHealthObligations: () => ipcRenderer.invoke(invoke.healthObligationsList),
  createHealthObligation: (payload: {
    type: "refill" | "lab_test" | "vaccination" | "screening" | "exercise" | "custom";
    title: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthObligationsCreate, payload),
  updateHealthObligation: (payload: {
    id: string;
    type?: "refill" | "lab_test" | "vaccination" | "screening" | "exercise" | "custom";
    title?: string;
    dueAt?: string | null;
    status?: "open" | "done";
    priority?: "low" | "normal" | "high";
    completedAt?: string | null;
    notes?: string;
  }) => ipcRenderer.invoke(invoke.healthObligationsUpdate, payload),
  completeHealthObligation: (id: string) => ipcRenderer.invoke(invoke.healthObligationsComplete, id),
  deleteHealthObligation: (id: string) => ipcRenderer.invoke(invoke.healthObligationsDelete, id),
  getHealthSummary: () => ipcRenderer.invoke(invoke.healthSummaryGet)
});
