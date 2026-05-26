import { Home, StickyNote, Bell, AlertTriangle, ListTodo, Palette, Database, Users, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { useBackupActions } from "../hooks/workspace/useBackupActions";
import { useTeamState } from "../hooks/team/useTeamState";
import { useTeamRealtime } from "../hooks/team/useTeamRealtime";
import { StatusBanner } from "./layout/StatusBanner";
import { SuccessBanner } from "./layout/SuccessBanner";
import { OnboardingPanel } from "./panels/OnboardingPanel";
import { OnboardingCoach } from "./panels/OnboardingCoach";
import { CommandPanel } from "./panels/CommandPanel";
import { CalendarPanel } from "./panels/CalendarPanel";
import { NotesPanel } from "./panels/NotesPanel";
import { RemindersPanel } from "./panels/RemindersPanel";
import { AboutPanel } from "./panels/AboutPanel";
import { ReleaseNotesPanel } from "./panels/ReleaseNotesPanel";
import { TasksPanel } from "./panels/TasksPanel";
import { DailyCommandCenterPanel } from "./panels/DailyCommandCenterPanel";
import { PlanTodayPanel } from "./panels/PlanTodayPanel";
import { EndOfDayReviewPanel } from "./panels/EndOfDayReviewPanel";
import { HomeDashboardPanel } from "./panels/HomeDashboardPanel";
import { AppearancePanel } from "./panels/AppearancePanel";
import { DataControlPanel } from "./panels/DataControlPanel";
import { ProjectsPanel } from "./panels/ProjectsPanel";
import { AiSettingsPanel } from "./panels/AiSettingsPanel";
import { TodayStrip } from "./layout/TodayStrip";
import { CommandPalette } from "./panels/CommandPalette";
import { ThemeSelect } from "./layout/ThemeSelect";
import { IconButton } from "./ui/IconButton";
import { InboxPanel } from "./panels/InboxPanel";
import { WorkItemDetailDrawer } from "./WorkItemDetailDrawer";
import { QuickCaptureDialog } from "./dialogs/QuickCaptureDialog";
import {
  STORAGE_ONBOARDED,
  STORAGE_ONBOARDING_DEFERRED,
  STORAGE_LAST_SEEN_RELEASE_VERSION
} from "../constants/storageKeys";
import {
  deriveDailyCommandCenter,
  derivePlanTodayQueue,
  deriveEndOfDayReview,
  type EndOfDayReview
} from "../lib/derived/daily-command-center";
import { deriveFocusBrief } from "../lib/derived/brief";
import { deriveAwayBrief } from "../lib/derived/away-brief";
import { getLastSeenAt, setLastSeenAt } from "../lib/last-seen";
import {
  findUnifiedWorkItem,
  getUnifiedWorkItemSourceLabel,
  getUnifiedWorkItemSourceForBriefKind
} from "../lib/unified-work-item-lookup";
import { setAutomationFocusIntent } from "../lib/automation-focus-intent";
import { getAssistantInvokeErrorMessage } from "../lib/errors";
import { getAssistantApi, requireAssistantApi } from "../lib/assistantApi";
import { getReleaseNote } from "../lib/release-notes.generated";
import { PRELOAD_BRIDGE_MISSING_MESSAGE } from "../constants/assistant";
import { measurePerformance, endMetric } from "../lib/performance";
import type { DailyCommandCenter, DailyCommandCenterFilter, PlanTodayQueue } from "../lib/derived/daily-command-center";
import type { BriefItem } from "../types";
import type { UnifiedWorkItem } from "../lib/derived/unified-work";
import type { AiConfigStatus, AiProvider } from "../../shared/ai/types";

type PersonalModule = "home" | "today" | "inbox" | "memos" | "reminders" | "tasks" | "automations";

export function AssistantShell(): JSX.Element {
  // Measure app startup performance
  const startupMetric = measurePerformance("app-startup");

  const [showAbout, setShowAbout] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<UnifiedWorkItem | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfigStatus | null>(null);
  const [activePersonalModule, setActivePersonalModule] = useState<PersonalModule>("home");
  const focusBriefRef = useRef<BriefItem[]>([]);
  const [dailyCommandCenter, setDailyCommandCenter] = useState<DailyCommandCenter>({
    nowItems: [],
    attentionItems: [],
    contextItems: [],
    awayItems: [],
    summary: "All clear - nothing needs attention right now.",
    pressure: { overdue: 0, dueToday: 0, upcoming: 0, context: 0 },
    filter: "all"
  });

  const [planTodayQueue, setPlanTodayQueue] = useState<PlanTodayQueue>({
    items: [],
    summary: "All clear - nothing needs planning today.",
    totalItems: 0
  });

  const [endOfDayReview, setEndOfDayReview] = useState<EndOfDayReview>({
    completedTasks: [],
    completedReminders: [],
    unfinishedTasks: [],
    unfinishedReminders: [],
    capturedNotes: [],
    summary: "No activity today.",
    totalCompleted: 0,
    totalUnfinished: 0,
    totalCaptured: 0
  });
  const [showEndOfDayReview, setShowEndOfDayReview] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCaptureType, setQuickCaptureType] = useState<"note" | "task" | "reminder" | "inbox">("inbox");
  const [quickCaptureText, setQuickCaptureText] = useState("");

  const setDailyCommandCenterFilter = (filter: DailyCommandCenterFilter) => {
    setDailyCommandCenter((prev) => ({ ...prev, filter }));
  };

  const handleReviewDay = () => {
    setShowEndOfDayReview(true);
    ui.setStatus("Opening your end-of-day review.");
  };

  const handleQuickCapture = (type: "note" | "task" | "reminder" | "inbox", text: string) => {
    setQuickCaptureType(type);
    setQuickCaptureText(text);
    setShowQuickCapture(true);
  };

  const handleQuickCaptureSaved = async (type: "note" | "task" | "reminder" | "inbox") => {
    // Refresh the appropriate data slice based on capture type
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

  function openUnifiedWorkItem(source: "local-note" | "local-task" | "local-reminder" | "team-task", id: string): void {
    const unifiedItem = findUnifiedWorkItem(inbox.unifiedItems, source, id);
    if (unifiedItem) {
      setSelectedWorkItem(unifiedItem);
      ui.setStatus(`${getUnifiedWorkItemSourceLabel(source)} opened.`);
    } else {
      ui.reportError(`${getUnifiedWorkItemSourceLabel(source)} not found in unified items.`);
    }
  }

  function openBriefItemInDrawer(briefItem: BriefItem): void {
    const source = getUnifiedWorkItemSourceForBriefKind(briefItem.kind);
    if (!source) {
      ui.reportError(`Cannot open ${briefItem.kind} in drawer.`);
      return;
    }

    const unifiedItem = findUnifiedWorkItem(inbox.unifiedItems, source, briefItem.sourceId);
    if (unifiedItem) {
      setSelectedWorkItem(unifiedItem);
      ui.setStatus(`${getUnifiedWorkItemSourceLabel(source)} opened.`);
    } else {
      ui.reportError(`${getUnifiedWorkItemSourceLabel(source)} not found in unified items.`);
    }
  }

  const team = useTeamState();

  // Keep team data fresh across Personal mode surfaces
  useTeamRealtime(team, { projects: true, tasks: true });

  // Compute team task status counts
  const teamOpenTasks = team.tasks.filter((t) => t.status === "open");
  const teamOverdueTasks = teamOpenTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
  );

  // Load team config on mount
  useEffect(() => {
    void team.loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load workspaces when config is set
  useEffect(() => {
    if (team.config?.configured) {
      void team.loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.config?.configured]);

  // Load projects and tasks when active workspace is set
  useEffect(() => {
    if (team.activeWorkspace) {
      void team.loadProjects();
      void team.loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace]);

  const { ui, data, ha, command, calendar, reminders, tasks, memos, onboarding, desk, display, inbox } =
    useAssistantWorkspace(setDailyCommandCenterFilter, {
      teamTasks: team.tasks,
      teamProjects: team.projects,
      mergeTeamTask: () => {},
      refreshTeamTasks: team.loadTasks,
      aiConfigured: aiConfig?.configured ?? false,
      onQuickCapture: handleQuickCapture
    });

  const backupActions = useBackupActions(data.refreshAll, ui.setStatus, ui.reportError);
  const appVersion = __APP_VERSION__;

  useEffect(() => {
    const handleShowAbout = () => setShowAbout(true);
    const api = getAssistantApi();
    const unsubscribe = api?.onShowAbout?.(handleShowAbout) ?? (() => {});
    return () => {
      unsubscribe();
    };
  }, []);

  // Command palette shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute daily command center when data changes
  useEffect(() => {
    const lastSeenAt = getLastSeenAt();
    const focusBrief = deriveFocusBrief({
      overdueTasks: tasks.overdueOpen,
      dueTodayTasks: tasks.dueTodayOpen,
      undatedOpenTasks: data.tasks.filter((task) => task.status === "open" && !task.dueAt),
      upcomingReminders: reminders.pending,
      selectedDayAgenda: calendar.selectedDayAgenda
        .filter(
          (item): item is import("../hooks/workspace/useCalendarState").AgendaItem & { type: "reminder" } =>
            item.type === "reminder"
        )
        .map((item) => ({
          id: item.id,
          text: item.text,
          dueAt: item.dueAt,
          recurrence: "none" as const,
          status: "pending" as const,
          notifyChannel: "desktop" as const
        })),
      pinnedNotes: data.notes.filter((note) => note.pinned),
      teamTasks: team.tasks.filter((t) => t.status === "open"),
      teamProjects: team.projects,
      automationRules: data.rules
    });
    const awayBrief = deriveAwayBrief({
      tasks: data.tasks,
      reminders: data.reminders,
      notes: data.notes,
      lastSeenAt,
      now: new Date()
    });
    focusBriefRef.current = focusBrief;
    const dcc = deriveDailyCommandCenter({ focusBrief, awayBrief, filter: dailyCommandCenter.filter });
    setDailyCommandCenter(dcc);

    // Derive Plan Today queue for Personal OS
    // Convert raw data to BriefItem format
    const localTasks: BriefItem[] = data.tasks.map((task) => ({
      id: `local-task-${task.id}`,
      kind: "task",
      label: task.title,
      detail: task.dueAt ? new Date(task.dueAt).toLocaleString() : undefined,
      urgency: task.dueAt
        ? new Date(task.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
          ? "overdue"
          : "today"
        : "context",
      sourceId: task.id,
      dueAt: task.dueAt || undefined
    }));

    const localReminders: BriefItem[] = data.reminders.map((reminder) => ({
      id: `local-reminder-${reminder.id}`,
      kind: "reminder",
      label: reminder.text,
      detail: reminder.dueAt ? new Date(reminder.dueAt).toLocaleString() : undefined,
      urgency: reminder.dueAt
        ? new Date(reminder.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))
          ? "overdue"
          : "today"
        : "context",
      sourceId: reminder.id,
      dueAt: reminder.dueAt || undefined
    }));

    const localNotes: BriefItem[] = data.notes.map((note) => ({
      id: `local-note-${note.id}`,
      kind: "note",
      label: note.title,
      detail: note.content ? note.content.substring(0, 50) : undefined,
      urgency: "context",
      sourceId: note.id
    }));

    const planToday = derivePlanTodayQueue({
      localTasks,
      localReminders,
      localNotes,
      now: new Date()
    });
    setPlanTodayQueue(planToday);

    const endOfDay = deriveEndOfDayReview({
      localTasks,
      localReminders,
      localNotes,
      now: new Date()
    });
    setEndOfDayReview(endOfDay);
  }, [
    tasks.overdueOpen,
    tasks.dueTodayOpen,
    reminders.pending,
    calendar.selectedDayAgenda,
    data.notes,
    data.rules,
    data.reminders,
    data.tasks,
    team.tasks,
    team.projects,
    dailyCommandCenter.filter
  ]);

  // Update last-seen timestamp after initial data refresh and desk render
  useEffect(() => {
    if (!data.isRefreshing) {
      setLastSeenAt(new Date().toISOString());
    }
  }, [data.isRefreshing]);

  // Load AI config on mount
  useEffect(() => {
    void (async () => {
      try {
        const api = getAssistantApi();
        if (!api) return;
        const config = await api.getAiConfig();
        setAiConfig(config);
      } catch {
        // Ignore errors if AI is not configured
      } finally {
        // End app startup measurement after initial setup
        endMetric(startupMetric);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show release notes if version changed
  useEffect(() => {
    const lastSeenVersion = window.localStorage.getItem(STORAGE_LAST_SEEN_RELEASE_VERSION);
    if (lastSeenVersion !== appVersion) {
      const releaseNote = getReleaseNote(appVersion);
      if (releaseNote) {
        setShowReleaseNotes(true);
      }
    }
  }, [appVersion]);

  const handleAiSetKey = async (provider: AiProvider, apiKey: string): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.setAiKey({ provider, apiKey });
    setAiConfig(config);
    return config;
  };

  const handleAiClearKey = async (): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.clearAiKey();
    setAiConfig(config);
    return config;
  };

  const handleAiTestKey = async (): Promise<{ success: true; model: string }> => {
    const api = requireAssistantApi();
    const result = await api.testAiKey();
    return result;
  };

  const handleAiRefresh = async (): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.getAiConfig();
    setAiConfig(config);
    return config;
  };

  // Refresh selected drawer item from inbox.unifiedItems, or close if deleted
  useEffect(() => {
    if (selectedWorkItem) {
      const refreshedItem = inbox.unifiedItems.find((item) => item.id === selectedWorkItem.id);
      if (refreshedItem) {
        setSelectedWorkItem(refreshedItem);
      } else {
        setSelectedWorkItem(null);
      }
    }
  }, [inbox.unifiedItems, selectedWorkItem]);

  const handleMarkSeen = () => {
    setLastSeenAt(new Date().toISOString());
    setDailyCommandCenter(
      deriveDailyCommandCenter({
        focusBrief: focusBriefRef.current,
        awayBrief: [],
        filter: dailyCommandCenter.filter
      })
    );
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
    setShowReleaseNotes(false);
  };

  return (
    <main className="container desktopShell">
      <header className="utilityToolbar">
        <div className="utilityToolbarLeft">
          <h1 className="appIdentity">Personal Assistant</h1>
          <div className="deskModeSwitch">
            <button
              type="button"
              className={`modeButton ${desk.mode === "personal" ? "modeButtonActive" : ""}`}
              onClick={() => desk.setMode("personal")}
            >
              Personal
            </button>
            <button
              type="button"
              className={`modeButton ${desk.mode === "projects" ? "modeButtonActive" : ""}`}
              onClick={() => desk.setMode("projects")}
            >
              Projects
            </button>
          </div>
        </div>
        <div className="utilityToolbarRight">
          <button type="button" className="statusChip" onClick={() => setActivePersonalModule("memos")}>
            <StickyNote size={14} />
            <span>Memos</span>
            <span className="statusChipCount">{data.notes.length}</span>
          </button>
          <button type="button" className="statusChip" onClick={() => setActivePersonalModule("reminders")}>
            <Bell size={14} />
            <span>Open</span>
            <span className="statusChipCount">{reminders.pending.length}</span>
          </button>
          <button type="button" className="statusChip" onClick={() => setActivePersonalModule("tasks")}>
            <ListTodo size={14} />
            <span>Tasks</span>
            <span className="statusChipCount">{data.tasks.filter((task) => task.status === "open").length}</span>
          </button>
          {reminders.overdue.length > 0 ? (
            <button
              type="button"
              className="statusChip statusChipAttention"
              onClick={() => setActivePersonalModule("reminders")}
            >
              <AlertTriangle size={14} />
              <span>Overdue</span>
              <span className="statusChipCount">{reminders.overdue.length}</span>
            </button>
          ) : null}
          {tasks.overdueOpen.length > 0 ? (
            <button
              type="button"
              className="statusChip statusChipAttention"
              onClick={() => setActivePersonalModule("tasks")}
            >
              <AlertTriangle size={14} />
              <span>Task overdue</span>
              <span className="statusChipCount">{tasks.overdueOpen.length}</span>
            </button>
          ) : null}
          {team.config?.configured && teamOpenTasks.length > 0 ? (
            <button
              type="button"
              className={`statusChip ${teamOverdueTasks.length > 0 ? "statusChipAttention" : ""}`}
              onClick={() => setDailyCommandCenterFilter("team")}
            >
              <Users size={14} />
              <span>Team</span>
              <span className="statusChipCount">{teamOpenTasks.length}</span>
            </button>
          ) : null}
          <IconButton
            icon={Home}
            label={ha.haReady ? "Home Assistant - linked (optional)" : "Home Assistant - optional"}
            onClick={handleOpenHouseholdWindow}
            variant={ha.haReady ? "default" : "ghost"}
          />
          <button
            type="button"
            className="ghostButton ghostButtonCompact"
            title="Customize appearance"
            onClick={() => setShowAppearance((s) => !s)}
          >
            <Palette size={14} />
          </button>
          <button
            type="button"
            className="ghostButton ghostButtonCompact"
            title="Data backup and reset"
            onClick={() => setShowData((s) => !s)}
          >
            <Database size={14} />
          </button>
          <button
            type="button"
            className="ghostButton ghostButtonCompact"
            title="AI configuration"
            onClick={() => setShowAi((s) => !s)}
          >
            <Sparkles size={14} />
          </button>
          <ThemeSelect theme={ui.theme} onChange={ui.setTheme} selectId="theme-select-desk" />
        </div>
      </header>

      <StatusBanner status={ui.status} error={ui.error} />

      <SuccessBanner successes={ui.successes} onDismiss={ui.dismissSuccess} onDismissAll={ui.dismissAllSuccesses} />

      {desk.mode === "projects" ? (
        <ProjectsPanel team={team} />
      ) : (
        <>
          <div className="moduleTabs">
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "home" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("home")}
            >
              Home
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "today" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "inbox" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("inbox")}
            >
              Inbox
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "memos" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("memos")}
            >
              Memos
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "reminders" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("reminders")}
            >
              Reminders
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "tasks" ? "moduleTabActive" : ""}`}
              onClick={() => setActivePersonalModule("tasks")}
            >
              Tasks
            </button>
            <button
              type="button"
              className={`moduleTab ${activePersonalModule === "automations" ? "moduleTabActive" : ""}`}
              onClick={() => {
                setAutomationFocusIntent("");
                handleOpenHouseholdWindow();
              }}
            >
              Automations
            </button>
          </div>

          {showPalette && (
            <CommandPalette
              notes={data.notes}
              tasks={data.tasks}
              reminders={data.reminders}
              rules={data.rules}
              devices={data.devices}
              teamTasks={team.tasks}
              teamProjects={team.projects}
              onOpenNote={(id) => {
                data.setQuery("");
                openUnifiedWorkItem("local-note", id);
              }}
              onOpenTask={(id) => {
                tasks.setFilter("all");
                openUnifiedWorkItem("local-task", id);
              }}
              onOpenReminder={(id) => {
                reminders.setFilter("all");
                openUnifiedWorkItem("local-reminder", id);
              }}
              onOpenAutomation={(id) => {
                setAutomationFocusIntent(id);
                handleOpenHouseholdWindow();
              }}
              onToggleDevice={(entityId) => {
                void ha.runDeviceToggle(entityId, entityId);
              }}
              onOpenTeamTask={(id) => {
                openUnifiedWorkItem("team-task", id);
              }}
              onOpenAppearance={() => setShowAppearance(true)}
              onClose={() => setShowPalette(false)}
            />
          )}

          {showAppearance && (
            <AppearancePanel
              theme={ui.theme}
              custom={ui.custom}
              display={display}
              onPresetChange={ui.setTheme}
              onOverride={ui.setCustomOverride}
              onReset={ui.resetCustomOverrides}
              onClose={() => setShowAppearance(false)}
            />
          )}
          {showData && (
            <DataControlPanel
              onExport={backupActions.exportData}
              onImport={backupActions.importData}
              onReset={backupActions.resetData}
              onHealthCheck={backupActions.healthCheck}
              onOptimize={backupActions.optimize}
              isExporting={backupActions.isExporting}
              isImporting={backupActions.isImporting}
              isResetting={backupActions.isResetting}
              isHealthChecking={backupActions.isHealthChecking}
              isOptimizing={backupActions.isOptimizing}
            />
          )}
          {showAi && (
            <AiSettingsPanel
              config={aiConfig}
              onSetKey={handleAiSetKey}
              onClearKey={handleAiClearKey}
              onTestKey={handleAiTestKey}
              onRefresh={handleAiRefresh}
              onClose={() => setShowAi(false)}
            />
          )}

          {onboarding.show && !onboarding.isComplete ? (
            <div className="onboardingHero">
              <OnboardingCoach
                currentStep={onboarding.currentStep}
                onOpenMemos={() => {
                  setActivePersonalModule("memos");
                  data.setQuery("");
                }}
                onOpenReminders={() => {
                  setActivePersonalModule("reminders");
                }}
                onOpenHousehold={handleOpenHouseholdWindow}
                onMarkNoteCreated={() => {
                  onboarding.markNoteCreated();
                  ui.setStatus("Great! Note created. Next: add a reminder.");
                }}
                onMarkReminderCreated={() => {
                  onboarding.markReminderCreated();
                  ui.setStatus("Reminder added. Next: connect Home Assistant (optional).");
                }}
                onSkipHomeAssistant={() => {
                  setActivePersonalModule("home");
                  onboarding.skipHomeAssistant();
                  window.localStorage.setItem(STORAGE_ONBOARDED, "1");
                  window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
                  onboarding.setShow(false);
                  ui.setStatus("Onboarding complete - you can connect Home Assistant anytime from Household.");
                }}
                onDefer={() => {
                  window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
                  onboarding.setShow(false);
                  ui.setStatus("Onboarding deferred - you can continue anytime from settings.");
                }}
              />
            </div>
          ) : onboarding.show ? (
            <div className="onboardingHero">
              <OnboardingPanel
                visible={onboarding.show}
                haReady={ha.haReady}
                commandHistoryLength={command.commandHistory.length}
                onHideForNow={() => {
                  window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
                  onboarding.setShow(false);
                  ui.setStatus("Understood - we will skip the guided intro.");
                }}
                onFinishSetup={() => {
                  onboarding.setShow(false);
                  window.localStorage.setItem(STORAGE_ONBOARDED, "1");
                  window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
                  ui.setStatus("Welcome aboard - intro marked complete.");
                }}
                onRunPreset={command.runPresetCommand}
              />
            </div>
          ) : null}

          {showAbout ? (
            <div className="onboardingHero">
              <AboutPanel version={appVersion} onClose={() => setShowAbout(false)} />
            </div>
          ) : null}

          <QuickCaptureDialog
            isOpen={showQuickCapture}
            onClose={() => setShowQuickCapture(false)}
            initialType={quickCaptureType}
            initialText={quickCaptureText}
            onShowSuccess={ui.showSuccess}
            onError={ui.reportError}
            onSaved={handleQuickCaptureSaved}
          />

          {showReleaseNotes ? (
            <div className="onboardingHero">
              <ReleaseNotesPanel
                version={appVersion}
                onClose={handleCloseReleaseNotes}
                onOpenAbout={() => {
                  setShowReleaseNotes(false);
                  setShowAbout(true);
                }}
              />
            </div>
          ) : null}

          {activePersonalModule === "home" ? (
            <>
              <HomeDashboardPanel
                data={dailyCommandCenter}
                onOpenToday={() => setActivePersonalModule("today")}
                onOpenInbox={() => setActivePersonalModule("inbox")}
                onOpenWorkItem={openBriefItemInDrawer}
                onOpenAutomations={(briefItem) => {
                  if (briefItem.kind === "automation") {
                    setAutomationFocusIntent(briefItem.sourceId);
                  }
                  handleOpenHouseholdWindow();
                }}
                onCompleteTask={tasks.completeById}
                onCompleteReminder={reminders.completeById}
                onSnoozeReminder={(id: string) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
              />
              <div className="homeLayout">
                <div className="homeLeft">
                  <CalendarPanel
                    calendarCursor={calendar.calendarCursor}
                    setCalendarCursor={calendar.setCalendarCursor}
                    monthCells={calendar.monthCells}
                    todayKey={calendar.todayKey}
                    selectedDateKey={calendar.calendarSelectedKey}
                    onSelectDateKey={calendar.setCalendarSelectedKey}
                    dayAgenda={calendar.selectedDayAgenda}
                    onCreateReminder={async (payload) => {
                      try {
                        const api = requireAssistantApi();
                        await api.createReminder(payload);
                        await data.refreshReminders();
                        ui.showSuccess("Reminder created.");
                      } catch (err) {
                        ui.reportError(getAssistantInvokeErrorMessage(err));
                      }
                    }}
                    onCreateTask={async (payload) => {
                      try {
                        await tasks.saveTask({
                          title: payload.title,
                          notes: payload.notes ?? "",
                          dueAt: payload.dueAt ?? null,
                          priority: payload.priority,
                          recurrence: payload.recurrence
                        });
                        ui.showSuccess("Task created.");
                      } catch (err) {
                        ui.reportError(getAssistantInvokeErrorMessage(err));
                      }
                    }}
                  />
                </div>
                <div className="homeRight">
                  <div className="commandHero">
                    <CommandPanel
                      commandInputRef={command.commandInputRef}
                      query={data.query}
                      reminderFilter={reminders.filter}
                      haReady={ha.haReady}
                      commandInput={command.commandInput}
                      setCommandInput={command.setCommandInput}
                      commandHints={command.commandHints}
                      commandHistory={command.commandHistory}
                      historyCursor={command.historyCursor}
                      setHistoryCursor={command.setHistoryCursor}
                      isRunningCommand={command.isRunningCommand}
                      onRunCommand={command.runCommandInternal}
                      onClearHistory={command.clearCommandHistory}
                      onClearNoteSearch={() => data.setQuery("")}
                      onPreset={command.runPresetCommand}
                      onHideDeskIfInputEmpty={desk.hideWindow}
                      aiDraft={command.aiDraft}
                      aiReply={command.aiReply}
                      onConfirmAiDraft={command.confirmAiDraft}
                      onCancelAiDraft={command.cancelAiDraft}
                      aiConfigured={aiConfig?.configured ?? false}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activePersonalModule === "today" && (
            <>
              <TodayStrip
                overdueCount={tasks.overdueOpen.length}
                dueTodayCount={tasks.dueTodayOpen.length}
                remindersCount={reminders.pending.length}
                notesCount={data.notes.length}
                automationsCount={data.rules.length}
                teamOpenCount={team.config?.configured ? teamOpenTasks.length : undefined}
                teamAttentionCount={team.config?.configured ? teamOverdueTasks.length : undefined}
                onFilterOverdue={() => {
                  setActivePersonalModule("tasks");
                  tasks.setFilter("overdue");
                }}
                onFilterDueToday={() => {
                  setActivePersonalModule("tasks");
                  tasks.setFilter("open");
                }}
                onFilterReminders={() => setActivePersonalModule("reminders")}
                onFilterNotes={() => setActivePersonalModule("memos")}
                onFilterAutomations={() => handleOpenHouseholdWindow()}
                onFilterTeam={() => {
                  setDailyCommandCenterFilter("team");
                  ui.setStatus("Showing team tasks.");
                }}
                onReviewDay={handleReviewDay}
              />

              <PlanTodayPanel
                queue={planTodayQueue}
                onCompleteTask={tasks.completeById}
                onCompleteReminder={reminders.completeById}
                onBulkCompleteTasks={tasks.bulkComplete}
                onSnoozeReminder={async (id: string, minutes: number) =>
                  await reminders.snoozeMinutes(id, minutes, `Snoozed ${minutes}m.`)
                }
                onUpdateTaskDueAt={async (id: string, dueAt: string | null) => {
                  const task = data.tasks.find((t) => t.id === id);
                  if (task) {
                    await tasks.saveTask({
                      id,
                      title: task.title,
                      notes: task.notes,
                      dueAt,
                      priority: task.priority,
                      recurrence: task.recurrence
                    });
                  }
                }}
                onUpdateReminderDueAt={async (id: string, dueAt: string) => {
                  const reminder = data.reminders.find((r) => r.id === id);
                  if (reminder) {
                    await reminders.updateById(id, reminder.text, dueAt);
                  }
                }}
                onOpenWorkItem={openBriefItemInDrawer}
                onOpenInbox={() => setActivePersonalModule("inbox")}
                onShowSuccess={ui.showSuccess}
                onError={ui.reportError}
              />

              <DailyCommandCenterPanel
                data={dailyCommandCenter}
                showAllSecondary={display.dccShowAllSecondary}
                onCompleteTask={tasks.completeById}
                onCompleteReminder={reminders.completeById}
                onSnoozeReminder={(id: string) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
                onMarkSeen={handleMarkSeen}
                onOpenTasks={() => setActivePersonalModule("tasks")}
                onOpenReminders={() => setActivePersonalModule("reminders")}
                onOpenNotes={() => setActivePersonalModule("memos")}
                onOpenAutomations={(briefItem) => {
                  if (briefItem.kind === "automation") {
                    setAutomationFocusIntent(briefItem.sourceId);
                  }
                  handleOpenHouseholdWindow();
                }}
                onOpenWorkItem={openBriefItemInDrawer}
                onOpenInbox={() => setActivePersonalModule("inbox")}
              />

              {showEndOfDayReview && (
                <EndOfDayReviewPanel
                  review={endOfDayReview}
                  onUpdateTaskDueAt={async (id: string, dueAt: string | null) => {
                    const task = data.tasks.find((t) => t.id === id);
                    if (task) {
                      await tasks.saveTask({
                        id,
                        title: task.title,
                        notes: task.notes,
                        dueAt,
                        priority: task.priority,
                        recurrence: task.recurrence
                      });
                    }
                  }}
                  onSnoozeReminder={async (id: string, minutes: number) =>
                    await reminders.snoozeMinutes(id, minutes, `Snoozed ${minutes}m.`)
                  }
                  onOpenWorkItem={openBriefItemInDrawer}
                  onShowSuccess={ui.showSuccess}
                  onError={ui.reportError}
                />
              )}
            </>
          )}

          {activePersonalModule === "inbox" && (
            <InboxPanel
              unifiedItems={inbox.unifiedItems}
              needsSorting={inbox.needsSorting}
              teamProjects={team.projects}
              createQuickNote={inbox.createQuickNote}
              createQuickTask={inbox.createQuickTask}
              createQuickReminder={inbox.createQuickReminder}
              convertNoteToTask={inbox.convertNoteToTask}
              convertNoteToReminder={inbox.convertNoteToReminder}
              sendTaskToTeam={inbox.sendTaskToTeam}
              completeTask={tasks.completeById}
              completeReminder={reminders.completeById}
              deleteTask={tasks.deleteById}
              deleteReminder={reminders.deleteById}
              deleteNote={(id) => memos.deleteNote(id, "Item")}
              onOpenItem={setSelectedWorkItem}
              onOpenToday={() => setActivePersonalModule("today")}
              onShowSuccess={ui.showSuccess}
              onError={ui.reportError}
            />
          )}

          {activePersonalModule === "memos" && (
            <div className="contentGrid">
              <div className="contentMain">
                <NotesPanel
                  onFetchNotes={data.refreshNotes}
                  onError={ui.reportError}
                  onShowSuccess={ui.showSuccess}
                  onDeleteNote={(id, title) => void memos.deleteNote(id, title)}
                  onUpdateNote={(payload) => void memos.updateNote(payload)}
                  onNoteCreated={() => onboarding.markNoteCreated()}
                />
              </div>
            </div>
          )}

          {activePersonalModule === "reminders" && (
            <div className="contentGrid">
              <div className="contentMain">
                <RemindersPanel
                  isRefreshing={data.isRefreshing}
                  reminderFilter={reminders.filter}
                  setReminderFilter={reminders.setFilter}
                  visibleReminders={reminders.visible}
                  onRefresh={data.refreshReminders}
                  onError={ui.reportError}
                  onShowSuccess={ui.showSuccess}
                  onSnooze10={(id) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
                  onSnooze60={(id) => void reminders.snoozeMinutes(id, 60, "Snoozed 1h.")}
                  onComplete={(id) => void reminders.completeById(id)}
                  onDelete={(id) => reminders.deleteById(id)}
                  onReminderCreated={() => onboarding.markReminderCreated()}
                />
              </div>
            </div>
          )}

          {activePersonalModule === "tasks" && (
            <div className="contentGrid">
              <div className="contentMain">
                <TasksPanel
                  filter={tasks.filter}
                  setFilter={tasks.setFilter}
                  tasks={tasks.visible}
                  onSaveTask={tasks.saveTask}
                  onComplete={tasks.completeById}
                  onDelete={tasks.deleteById}
                  onBulkComplete={tasks.bulkComplete}
                  onUpdatePriority={tasks.updatePriority}
                  onUndo={tasks.undo}
                  canUndo={tasks.canUndo}
                />
              </div>
            </div>
          )}
        </>
      )}

      {selectedWorkItem && (
        <WorkItemDetailDrawer
          item={selectedWorkItem}
          onClose={() => setSelectedWorkItem(null)}
          onCompleteTask={tasks.completeById}
          onCompleteReminder={reminders.completeById}
          onSnoozeReminder={(id, minutes) => reminders.snoozeMinutes(id, minutes, `Snoozed ${minutes}m.`)}
          onDeleteTask={tasks.deleteById}
          onDeleteReminder={reminders.deleteById}
          onDeleteNote={(id) => memos.deleteNote(id, "Item")}
          onUpdateNote={(id, title, content) => memos.updateNote({ id, title, content })}
          onUpdateTask={(id, patch) => tasks.saveTask({ id, ...patch })}
          onUpdateReminder={(id, text, dueAt) => reminders.updateById(id, text, dueAt)}
          onUpdateTeamTask={async (id, patch) => {
            const existingTask = team.tasks.find((t) => t.id === id);
            if (!existingTask) {
              ui.reportError("Team task not found.");
              return;
            }
            const updatedTask = {
              ...existingTask,
              ...patch
            };
            await team.updateTask(updatedTask);
          }}
          onConvertNoteToTask={inbox.convertNoteToTask}
          onConvertNoteToReminder={inbox.convertNoteToReminder}
          onShowSuccess={ui.showSuccess}
          onError={ui.reportError}
        />
      )}
    </main>
  );
}
