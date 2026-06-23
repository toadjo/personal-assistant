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

  const teamWorkspace = {
    id: "workspace-marketing",
    name: "Marketing Team",
    workspaceKey: "ABCD2345EFGH6789",
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "user-alice"
  };
  const teamProject = {
    id: "project-q1",
    workspaceId: teamWorkspace.id,
    name: "Q1 Campaign",
    createdAt: "2024-01-02T00:00:00.000Z",
    createdBy: "user-alice"
  };
  const teamTask = {
    id: "task-design-logo",
    workspaceId: teamWorkspace.id,
    projectId: teamProject.id,
    title: "Design logo",
    notes: "",
    dueAt: null,
    priority: "normal",
    status: "open",
    recurrence: "none",
    assigneeDisplayName: "Alice",
    createdAt: "2024-01-03T00:00:00.000Z",
    createdBy: "user-alice",
    updatedAt: "2024-01-03T00:00:00.000Z",
    updatedBy: "user-alice"
  };
  const teamConfig = {
    configured: true,
    backendConfigured: true,
    backendMode: "hosted",
    displayName: "Alice",
    activeWorkspaceId: teamWorkspace.id
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
    getSecurityPolicy: async () => ({
      schemaVersion: 1,
      mode: "personal",
      allowAi: true,
      allowTeamSync: true,
      allowHomeAssistant: true,
      allowConnectedCalendar: true,
      allowGoogleCalendar: true,
      allowMicrosoftCalendar: true,
      allowCrashReporting: false,
      allowBackupExport: true,
      allowBackupImport: true,
      allowExternalUrls: true,
      requireSecureSecretStorage: false,
      allowedHosts: []
    }),
    listExecutionLogs: async () => [],
    listRules: async () => [],
    createRule: async () => {},
    deleteRule: async () => {},
    setRuleEnabled: async () => {},
    logRendererError: async () => {},
    getAutoBackupStatus: async () => ({
      enabled: false,
      lastRunAt: null,
      lastSuccessAt: null,
      lastError: null,
      backupDir: "/tmp/backups",
      retainedCount: 0
    }),
    setAutoBackupEnabled: async (enabled) => ({
      enabled,
      lastRunAt: null,
      lastSuccessAt: null,
      lastError: null,
      backupDir: "/tmp/backups",
      retainedCount: 0
    }),
    runAutoBackupNow: async () => ({
      success: true,
      filePath: "/tmp/backups/auto-backup-test.json",
      error: null,
      pruned: []
    }),
    onRemindersUpdated: () => () => {},
    onCommand: () => () => {},
    onShowAbout: () => () => {},
    openHouseholdWindow: async () => true,
    focusDeskWindow: async () => true,
    hideDeskWindow: async () => true,
    openDataFolder: async () => {},
    teamGetConfig: async () => ({ ...teamConfig }),
    teamSetConfig: async () => {},
    teamSetDisplayName: async () => {},
    teamClearConfig: async () => {},
    teamWorkspacesList: async () => [{ ...teamWorkspace }],
    teamWorkspacesCreate: async () => ({ ...teamWorkspace }),
    teamWorkspacesJoin: async () => ({ ...teamWorkspace }),
    teamWorkspacesSetActive: async () => {},
    teamProjectsList: async () => [{ ...teamProject }],
    teamProjectsCreate: async () => ({ ...teamProject }),
    teamTasksList: async () => [{ ...teamTask }],
    teamTasksCreate: async () => ({ ...teamTask }),
    teamTasksUpdate: async () => ({ ...teamTask }),
    teamRealtimeStart: async () => {},
    teamRealtimeStop: async () => {},
    onTeamDataUpdated: () => () => {}
  };
})();
