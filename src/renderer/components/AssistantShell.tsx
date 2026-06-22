import { useEffect, useRef, useState } from "react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { useBackupActions } from "../hooks/workspace/useBackupActions";
import { useTeamState } from "../hooks/team/useTeamState";
import { useTeamRealtime } from "../hooks/team/useTeamRealtime";
import { useExternalCalendarEvents } from "../hooks/workspace/useExternalCalendarEvents";
import { PanelErrorBoundary } from "./ErrorBoundary";
import { StatusBanner } from "./layout/StatusBanner";
import { SuccessBanner } from "./layout/SuccessBanner";
import { ProjectsPanel } from "./panels/ProjectsPanel";
import { ShellChrome } from "./shell/ShellChrome";
import { ShellModuleTabs } from "./shell/ShellModuleTabs";
import { ShellOverlays } from "./shell/ShellOverlays";
import { OnboardingFlow } from "./shell/OnboardingFlow";
import { ShellModuleRouter } from "./shell/ShellModuleRouter";
import { ShellWorkItemDrawer } from "./shell/ShellWorkItemDrawer";
import { useShellModals } from "../hooks/shell/useShellModals";
import { useShellNav, type QuickCaptureType } from "../hooks/shell/useShellNav";
import { useShellDrawer } from "../hooks/shell/useShellDrawer";
import { useShellDerivedState } from "../hooks/shell/useShellDerivedState";
import { useAiConfig } from "../hooks/shell/useAiConfig";
import { useShellKeybindings } from "../hooks/shell/useShellKeybindings";
import { STORAGE_LAST_SEEN_RELEASE_VERSION } from "../constants/storageKeys";
import { setLastSeenAt } from "../lib/last-seen";
import { getAssistantApi } from "../lib/assistantApi";
import { getReleaseNote } from "../lib/release-notes.generated";
import { PRELOAD_BRIDGE_MISSING_MESSAGE } from "../constants/assistant";
import { measurePerformance, endMetric } from "../lib/performance";
import type { ExternalCalendarEvent } from "../../shared/types";
import type { DailyCommandCenterFilter } from "../lib/derived/daily-command-center";

export function AssistantShell(): JSX.Element {
  const startupMetric = measurePerformance("app-startup");

  const modals = useShellModals();
  const nav = useShellNav();
  const team = useTeamState();
  useTeamRealtime(team, { projects: true, tasks: true });

  const [externalCalendarEvents, setExternalCalendarEvents] = useState<ExternalCalendarEvent[]>([]);
  const [externalCalendarRefreshKey, setExternalCalendarRefreshKey] = useState(0);

  const setDccFilterRef = useRef<(f: DailyCommandCenterFilter) => void>(() => {});

  const ai = useAiConfig({ onStartupComplete: () => endMetric(startupMetric) });

  useEffect(() => {
    void team.loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (team.config?.configured) {
      void team.loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.config?.configured]);

  useEffect(() => {
    if (team.activeWorkspace) {
      void team.loadProjects();
      void team.loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace]);

  const workspace = useAssistantWorkspace((f) => setDccFilterRef.current(f), {
    teamTasks: team.tasks,
    teamProjects: team.projects,
    mergeTeamTask: () => {},
    refreshTeamTasks: team.loadTasks,
    aiConfigured: ai.isConfigured,
    onQuickCapture: nav.quickCapture.open,
    externalCalendarEvents
  });

  const { ui, data, ha, command, calendar, reminders, tasks, desk, inbox } = workspace;

  const derived = useShellDerivedState({
    overdueOpenTasks: tasks.overdueOpen,
    dueTodayOpenTasks: tasks.dueTodayOpen,
    pendingReminders: reminders.pending,
    selectedDayAgenda: calendar.selectedDayAgenda,
    notes: data.notes,
    tasks: data.tasks,
    reminders: data.reminders,
    rules: data.rules,
    teamTasks: team.tasks,
    teamProjects: team.projects
  });

  useEffect(() => {
    setDccFilterRef.current = derived.setDailyCommandCenterFilter;
  }, [derived.setDailyCommandCenterFilter]);

  const drawer = useShellDrawer({
    unifiedItems: inbox.unifiedItems,
    setStatus: ui.setStatus,
    reportError: ui.reportError
  });

  const { externalEvents: loadedExternalEvents, reload: reloadExternalCalendarEvents } = useExternalCalendarEvents(
    calendar.calendarCursor,
    externalCalendarRefreshKey,
    ui.reportError
  );

  useEffect(() => {
    setExternalCalendarEvents(loadedExternalEvents);
  }, [loadedExternalEvents]);

  const backupActions = useBackupActions(data.refreshAll, ui.setStatus, ui.reportError);
  const appVersion = __APP_VERSION__;

  useShellKeybindings({
    onShowAbout: modals.openAbout,
    onTogglePalette: modals.togglePalette
  });

  useEffect(() => {
    if (!data.isLoading) {
      setLastSeenAt(new Date().toISOString());
    }
  }, [data.isLoading]);

  useEffect(() => {
    const lastSeenVersion = window.localStorage.getItem(STORAGE_LAST_SEEN_RELEASE_VERSION);
    if (lastSeenVersion !== appVersion) {
      const releaseNote = getReleaseNote(appVersion);
      if (releaseNote) {
        modals.openReleaseNotes();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appVersion]);

  const teamOpenTasks = team.tasks.filter((t) => t.status === "open");
  const teamOverdueTasks = teamOpenTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
  );

  const handleQuickCaptureSaved = async (type: QuickCaptureType) => {
    switch (type) {
      case "note":
      case "inbox":
        await data.refreshNotes();
        break;
      case "task":
        await data.refreshTasks();
        break;
      case "reminder":
        await data.refreshReminders();
        break;
    }
  };

  const handleReviewDay = () => {
    nav.setActivePersonalModule("today");
    modals.openEndOfDayReview();
    ui.setStatus("Opening your end-of-day review.");
  };

  const handleOpenHouseholdWindow = () => {
    const api = getAssistantApi();
    if (!api?.openHouseholdWindow) {
      ui.reportError(PRELOAD_BRIDGE_MISSING_MESSAGE);
      return;
    }
    void api.openHouseholdWindow();
  };

  const handleCloseReleaseNotes = () => {
    window.localStorage.setItem(STORAGE_LAST_SEEN_RELEASE_VERSION, appVersion);
    modals.closeReleaseNotes();
  };

  const refreshConnectedCalendarData = async (): Promise<void> => {
    setExternalCalendarRefreshKey((key) => key + 1);
    await reloadExternalCalendarEvents();
  };

  return (
    <main className="container desktopShell">
      <ShellChrome
        deskMode={desk.mode}
        onSetDeskMode={desk.setMode}
        counts={{
          notes: data.notes.length,
          openReminders: reminders.pending.length,
          openTasks: data.tasks.filter((task) => task.status === "open").length,
          overdueReminders: reminders.overdue.length,
          overdueTasks: tasks.overdueOpen.length,
          teamOpen: team.config?.configured && teamOpenTasks.length > 0 ? teamOpenTasks.length : null,
          teamOverdue: teamOverdueTasks.length
        }}
        haReady={ha.haReady}
        onOpenHousehold={handleOpenHouseholdWindow}
        onSetActivePersonalModule={nav.setActivePersonalModule}
        onSetDailyCommandCenterFilter={derived.setDailyCommandCenterFilter}
        modals={modals}
        theme={ui.theme}
        onSetTheme={ui.setTheme}
      />

      <StatusBanner status={ui.status} error={ui.error} />
      <SuccessBanner successes={ui.successes} onDismiss={ui.dismissSuccess} onDismissAll={ui.dismissAllSuccesses} />

      {desk.mode === "projects" ? (
        <ProjectsPanel team={team} />
      ) : (
        <>
          <ShellModuleTabs
            active={nav.activePersonalModule}
            onSelect={nav.setActivePersonalModule}
            onOpenHousehold={handleOpenHouseholdWindow}
          />
          <ShellOverlays
            modals={modals}
            appVersion={appVersion}
            workspace={workspace}
            team={team}
            backupActions={backupActions}
            ai={ai}
            quickCapture={nav.quickCapture}
            onOpenLocalNote={(id) => drawer.openUnifiedWorkItem("local-note", id)}
            onOpenLocalTask={(id) => drawer.openUnifiedWorkItem("local-task", id)}
            onOpenLocalReminder={(id) => drawer.openUnifiedWorkItem("local-reminder", id)}
            onOpenTeamTask={(id) => drawer.openUnifiedWorkItem("team-task", id)}
            onOpenHousehold={handleOpenHouseholdWindow}
            onConnectedAccountsChanged={refreshConnectedCalendarData}
            onReleaseNotesOpenAbout={() => {
              modals.closeReleaseNotes();
              modals.openAbout();
            }}
            onCloseReleaseNotes={handleCloseReleaseNotes}
            onQuickCaptureSaved={handleQuickCaptureSaved}
          />
          <OnboardingFlow
            onboarding={workspace.onboarding}
            haReady={ha.haReady}
            commandHistoryLength={command.commandHistory.length}
            onOpenMemos={() => {
              nav.setActivePersonalModule("memos");
              data.setQuery("");
            }}
            onOpenReminders={() => nav.setActivePersonalModule("reminders")}
            onGoHome={() => nav.setActivePersonalModule("home")}
            onOpenHousehold={handleOpenHouseholdWindow}
            onSetStatus={ui.setStatus}
            onRunPreset={command.runPresetCommand}
          />
          <PanelErrorBoundary
            scope={`router:${nav.activePersonalModule}`}
            fallbackTitle="This module hit a snag"
            onCaught={({ message }) => ui.reportError(message)}
            resetKeys={[nav.activePersonalModule]}
          >
            <ShellModuleRouter
              active={nav.activePersonalModule}
              workspace={workspace}
              team={team}
              derived={derived}
              showEndOfDayReview={modals.showEndOfDayReview}
              aiConfigured={ai.isConfigured}
              teamOpenCount={team.config?.configured ? teamOpenTasks.length : undefined}
              teamAttentionCount={team.config?.configured ? teamOverdueTasks.length : undefined}
              onSelectModule={nav.setActivePersonalModule}
              onOpenHousehold={handleOpenHouseholdWindow}
              onOpenBriefItem={drawer.openBriefItemInDrawer}
              onOpenWorkItem={drawer.setSelectedWorkItem}
              onReviewDay={handleReviewDay}
              onSetDailyCommandCenterFilter={derived.setDailyCommandCenterFilter}
              onSetStatus={ui.setStatus}
            />
          </PanelErrorBoundary>
        </>
      )}

      <ShellWorkItemDrawer item={drawer.selectedWorkItem} onClose={drawer.close} workspace={workspace} team={team} />
    </main>
  );
}
