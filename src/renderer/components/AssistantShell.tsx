import { Home, StickyNote, Bell, AlertTriangle, ListTodo, Palette, Database, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { useBackupActions } from "../hooks/workspace/useBackupActions";
import { useTeamState } from "../hooks/team/useTeamState";
import { useTeamRealtime } from "../hooks/team/useTeamRealtime";
import { StatusBanner } from "./layout/StatusBanner";
import { SuccessBanner } from "./layout/SuccessBanner";
import { OnboardingPanel } from "./panels/OnboardingPanel";
import { GuidedOnboardingPanel } from "./panels/GuidedOnboardingPanel";
import { CommandPanel } from "./panels/CommandPanel";
import { CalendarPanel } from "./panels/CalendarPanel";
import { NotesPanel } from "./panels/NotesPanel";
import { RemindersPanel } from "./panels/RemindersPanel";
import { AboutPanel } from "./panels/AboutPanel";
import { TasksPanel } from "./panels/TasksPanel";
import { DailyCommandCenterPanel } from "./panels/DailyCommandCenterPanel";
import { AppearancePanel } from "./panels/AppearancePanel";
import { DataControlPanel } from "./panels/DataControlPanel";
import { ProjectsPanel } from "./panels/ProjectsPanel";
import { TodayStrip } from "./layout/TodayStrip";
import { CommandPalette } from "./panels/CommandPalette";
import { ThemeSelect } from "./layout/ThemeSelect";
import { StatusChip } from "./ui/StatusChip";
import { IconButton } from "./ui/IconButton";
import { InboxPanel } from "./panels/InboxPanel";
import { WorkItemDetailDrawer } from "./WorkItemDetailDrawer";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";
import { deriveDailyCommandCenter } from "../lib/derived/daily-command-center";
import { deriveFocusBrief } from "../lib/derived/brief";
import { deriveAwayBrief } from "../lib/derived/away-brief";
import { getLastSeenAt, setLastSeenAt } from "../lib/last-seen";
import type { DailyCommandCenter, DailyCommandCenterFilter } from "../lib/derived/daily-command-center";
import type { BriefItem } from "../types";
import type { UnifiedWorkItem } from "../lib/derived/unified-work";

export function AssistantShell(): JSX.Element {
  const [showAbout, setShowAbout] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<UnifiedWorkItem | null>(null);
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

  const setDailyCommandCenterFilter = (filter: DailyCommandCenterFilter) => {
    setDailyCommandCenter((prev) => ({ ...prev, filter }));
  };

  const team = useTeamState();

  // Keep team data fresh across Personal mode surfaces
  useTeamRealtime(team, { projects: true, tasks: true });

  // Compute team task status counts
  const teamOpenTasks = team.tasks.filter(t => t.status === "open");
  const teamOverdueTasks = teamOpenTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0)));
  const _teamDueTodayTasks = teamOpenTasks.filter(t => {
    if (!t.dueAt) return false;
    const dueDate = new Date(t.dueAt);
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    return dueDate >= todayStart && dueDate <= todayEnd;
  });

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
      refreshTeamTasks: team.loadTasks
    });

  const backupActions = useBackupActions(data.refreshAll, ui.setStatus, ui.reportError);
  const appVersion = __APP_VERSION__;

  useEffect(() => {
    const handleShowAbout = () => setShowAbout(true);
    const unsubscribe = window.assistantApi.onShowAbout(handleShowAbout);
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
      teamTasks: team.tasks.filter(t => t.status === "open"),
      teamProjects: team.projects
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
  }, [
    data.tasks,
    data.reminders,
    data.notes,
    tasks.overdueOpen,
    tasks.dueTodayOpen,
    reminders.pending,
    calendar.selectedDayAgenda,
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

  // Close drawer if selected item is no longer in inbox after data refresh
  useEffect(() => {
    if (selectedWorkItem) {
      const itemExists = inbox.unifiedItems.some((item) => item.id === selectedWorkItem.id);
      if (!itemExists) {
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
          <StatusChip icon={StickyNote} label="Memos" count={data.notes.length} />
          <StatusChip icon={Bell} label="Open" count={reminders.pending.length} />
          <StatusChip
            icon={ListTodo}
            label="Tasks"
            count={data.tasks.filter((task) => task.status === "open").length}
          />
          {reminders.overdue.length > 0 ? (
            <StatusChip icon={AlertTriangle} label="Overdue" count={reminders.overdue.length} variant="attention" />
          ) : null}
          {tasks.overdueOpen.length > 0 ? (
            <StatusChip
              icon={AlertTriangle}
              label="Task overdue"
              count={tasks.overdueOpen.length}
              variant="attention"
            />
          ) : null}
          {team.config?.configured && teamOpenTasks.length > 0 ? (
            <StatusChip
              icon={Users}
              label="Team"
              count={teamOpenTasks.length}
              variant={teamOverdueTasks.length > 0 ? "attention" : undefined}
            />
          ) : null}
          <IconButton
            icon={Home}
            label={ha.haReady ? "Home Assistant - linked (optional)" : "Home Assistant - optional"}
            onClick={() => void window.assistantApi.openHouseholdWindow()}
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
          <ThemeSelect theme={ui.theme} onChange={ui.setTheme} selectId="theme-select-desk" />
        </div>
      </header>

      <StatusBanner status={ui.status} error={ui.error} />

      <SuccessBanner successes={ui.successes} onDismiss={ui.dismissSuccess} onDismissAll={ui.dismissAllSuccesses} />

      {desk.mode === "projects" ? (
        <ProjectsPanel team={team} />
      ) : (
        <>
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
            />
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
                ui.setStatus(`Note opened: ${id}`);
              }}
              onOpenTask={(id) => {
                tasks.setFilter("all");
                ui.setStatus(`Task opened: ${id}`);
              }}
              onOpenReminder={(id) => {
                reminders.setFilter("all");
                ui.setStatus(`Reminder opened: ${id}`);
              }}
              onOpenAutomation={(id) => {
                ui.setStatus(`Automation opened: ${id}`);
              }}
              onToggleDevice={(entityId) => {
                void ha.runDeviceToggle(entityId, entityId);
              }}
              onOpenTeamTask={(id) => {
                const unifiedItem = inbox.unifiedItems.find(item => item.source === "team-task" && item.sourceId === id);
                if (unifiedItem) {
                  setSelectedWorkItem(unifiedItem);
                  ui.setStatus("Team task opened.");
                } else {
                  ui.reportError("Team task not found in unified items.");
                }
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
              isExporting={backupActions.isExporting}
              isImporting={backupActions.isImporting}
              isResetting={backupActions.isResetting}
            />
          )}

          {onboarding.show && !onboarding.isComplete ? (
            <div className="onboardingHero">
              <GuidedOnboardingPanel
                currentStep={onboarding.currentStep}
                onComplete={() => {
                  window.localStorage.setItem(STORAGE_ONBOARDED, "1");
                  window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
                  onboarding.setShow(false);
                  ui.setStatus("Welcome aboard - onboarding complete!");
                }}
                onCreateNote={() => {
                  data.setQuery("");
                  onboarding.markNoteCreated();
                  ui.setStatus("Great! Note created. Next: add a reminder.");
                }}
                onCreateReminder={() => {
                  onboarding.markReminderCreated();
                  ui.setStatus("Reminder added. Next: connect Home Assistant (optional).");
                }}
                onOpenHousehold={() => {
                  void window.assistantApi.openHouseholdWindow();
                }}
                onSkipHomeAssistant={() => {
                  onboarding.skipHomeAssistant();
                  window.localStorage.setItem(STORAGE_ONBOARDED, "1");
                  window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
                  onboarding.setShow(false);
                  ui.setStatus("Onboarding complete - you can connect Home Assistant anytime from Household.");
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

          <TodayStrip
            overdueCount={tasks.overdueOpen.length}
            dueTodayCount={tasks.dueTodayOpen.length}
            remindersCount={reminders.pending.length}
            notesCount={data.notes.length}
            automationsCount={data.rules.length}
            teamOpenCount={team.config?.configured ? teamOpenTasks.length : undefined}
            teamAttentionCount={team.config?.configured ? teamOverdueTasks.length : undefined}
            onFilterOverdue={() => tasks.setFilter("overdue")}
            onFilterDueToday={() => tasks.setFilter("open")}
            onFilterReminders={() => reminders.setFilter("pending")}
            onFilterNotes={() => data.setQuery("")}
            onFilterAutomations={() => {
              /* automations don't have a panel filter, noop */
            }}
            onFilterTeam={() => {
              setDailyCommandCenterFilter("team");
              ui.setStatus("Showing team tasks.");
            }}
          />

          <DailyCommandCenterPanel
            data={dailyCommandCenter}
            showAllSecondary={display.dccShowAllSecondary}
            onCompleteTask={tasks.completeById}
            onCompleteReminder={reminders.completeById}
            onSnoozeReminder={(id: string) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
            onMarkSeen={handleMarkSeen}
            onOpenTasks={tasks.setFilter}
            onOpenReminders={reminders.setFilter}
            onOpenNotes={() => data.setQuery("")}
            onOpenWorkItem={(briefItem) => {
              // Map BriefItem to UnifiedWorkItem using sourceId and kind
              const kindToSource: Record<string, string> = {
                task: "local-task",
                reminder: "local-reminder",
                note: "local-note",
                "team-task": "team-task"
              };
              const source = kindToSource[briefItem.kind];
              if (!source) return; // Don't map automation or agenda items

              const unifiedItem = inbox.unifiedItems.find(
                (item) => item.sourceId === briefItem.sourceId && item.source === source
              );
              if (unifiedItem) {
                setSelectedWorkItem(unifiedItem);
              }
            }}
          />

          <InboxPanel
            unifiedItems={inbox.unifiedItems}
            needsSorting={inbox.needsSorting}
            createQuickNote={inbox.createQuickNote}
            createQuickTask={inbox.createQuickTask}
            createQuickReminder={inbox.createQuickReminder}
            convertNoteToTask={inbox.convertNoteToTask}
            convertNoteToReminder={inbox.convertNoteToReminder}
            sendTaskToTeam={inbox.sendTaskToTeam}
            onOpenItem={setSelectedWorkItem}
            onShowSuccess={ui.showSuccess}
            onError={ui.reportError}
          />

          <div className="contentGrid">
            <div className="contentMain">
              <div className="todayStrip">
                <CalendarPanel
                  calendarCursor={calendar.calendarCursor}
                  setCalendarCursor={calendar.setCalendarCursor}
                  monthCells={calendar.monthCells}
                  todayKey={calendar.todayKey}
                  selectedDateKey={calendar.calendarSelectedKey}
                  onSelectDateKey={calendar.setCalendarSelectedKey}
                  dayAgenda={calendar.selectedDayAgenda}
                  agendaFilter={calendar.agendaFilter}
                  setAgendaFilter={calendar.setAgendaFilter}
                  onCreateReminder={(dateKey) => {
                    ui.setStatus(`Create reminder for ${dateKey} (not yet implemented).`);
                  }}
                  onCreateTask={(dateKey) => {
                    ui.setStatus(`Create task for ${dateKey} (not yet implemented).`);
                  }}
                />
              </div>
            </div>
            <div>
              <NotesPanel
                onFetchNotes={data.refreshNotes}
                onError={ui.reportError}
                onShowSuccess={ui.showSuccess}
                onDeleteNote={(id, title) => void memos.deleteNote(id, title)}
                onUpdateNote={(payload) => void memos.updateNote(payload)}
                onNoteCreated={() => onboarding.markNoteCreated()}
              />
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
          onUpdateTask={(id, title, notes) => tasks.updateDetailsById(id, title, notes)}
          onUpdateReminder={(id, text, dueAt) => reminders.updateById(id, text, dueAt)}
          onUpdateTeamTask={async (id, patch) => {
            const existingTask = team.tasks.find(t => t.id === id);
            if (!existingTask) {
              ui.reportError("Team task not found.");
              return;
            }
            const updatedTask = {
              ...existingTask,
              ...patch,
              updatedAt: new Date().toISOString(),
              updatedBy: "user"
            };
            await team.updateTask(updatedTask);
            ui.showSuccess("Team task updated.");
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
