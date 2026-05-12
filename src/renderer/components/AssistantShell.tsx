import { Home, StickyNote, Bell, AlertTriangle, ListTodo, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
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
import { ThemeSelect } from "./layout/ThemeSelect";
import { StatusChip } from "./ui/StatusChip";
import { IconButton } from "./ui/IconButton";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";
import { deriveDailyCommandCenter } from "../lib/derived/daily-command-center";
import { deriveFocusBrief } from "../lib/derived/brief";
import { deriveAwayBrief } from "../lib/derived/away-brief";
import { getLastSeenAt, setLastSeenAt } from "../lib/last-seen";
import type { DailyCommandCenter } from "../lib/derived/daily-command-center";
import type { BriefItem } from "../types";

export function AssistantShell(): JSX.Element {
  const { ui, data, ha, command, calendar, reminders, tasks, memos, onboarding, desk, display } = useAssistantWorkspace();
  const [showAbout, setShowAbout] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const focusBriefRef = useRef<BriefItem[]>([]);
  const [dailyCommandCenter, setDailyCommandCenter] = useState<DailyCommandCenter>({
    nowItems: [],
    attentionItems: [],
    contextItems: [],
    awayItems: [],
    summary: "All clear - nothing needs attention right now.",
    pressure: { overdue: 0, dueToday: 0, upcoming: 0, context: 0 }
  });
  const appVersion = __APP_VERSION__;

  useEffect(() => {
    const handleShowAbout = () => setShowAbout(true);
    const unsubscribe = window.assistantApi.onShowAbout(handleShowAbout);
    return () => {
      unsubscribe();
    };
  }, []);

  // Compute daily command center when data changes
  useEffect(() => {
    const lastSeenAt = getLastSeenAt();
    const focusBrief = deriveFocusBrief({
      overdueTasks: tasks.overdueOpen,
      dueTodayTasks: tasks.dueTodayOpen,
      upcomingReminders: reminders.pending,
      selectedDayAgenda: calendar.selectedDayAgenda,
      pinnedNotes: data.notes.filter((note) => note.pinned)
    });
    const awayBrief = deriveAwayBrief({
      tasks: data.tasks,
      reminders: data.reminders,
      notes: data.notes,
      lastSeenAt,
      now: new Date()
    });
    focusBriefRef.current = focusBrief;
    const dcc = deriveDailyCommandCenter({ focusBrief, awayBrief });
    setDailyCommandCenter(dcc);
  }, [data.tasks, data.reminders, data.notes, tasks.overdueOpen, tasks.dueTodayOpen, reminders.pending, calendar.selectedDayAgenda]);

  // Update last-seen timestamp after initial data refresh and desk render
  useEffect(() => {
    if (!data.isRefreshing) {
      setLastSeenAt(new Date().toISOString());
    }
  }, [data.isRefreshing]);

  const handleMarkSeen = () => {
    setLastSeenAt(new Date().toISOString());
    setDailyCommandCenter(
      deriveDailyCommandCenter({
        focusBrief: focusBriefRef.current,
        awayBrief: []
      })
    );
  };

  return (
    <main className="container desktopShell">
      <header className="utilityToolbar">
        <div className="utilityToolbarLeft">
          <h1 className="appIdentity">Personal Assistant</h1>
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
          <IconButton
            icon={Home}
            label={ha.haReady ? "Home Assistant — linked (optional)" : "Home Assistant — optional"}
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
          <ThemeSelect theme={ui.theme} onChange={ui.setTheme} selectId="theme-select-desk" />
        </div>
      </header>

      <StatusBanner status={ui.status} error={ui.error} />

      <SuccessBanner successes={ui.successes} onDismiss={ui.dismissSuccess} onDismissAll={ui.dismissAllSuccesses} />

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

      {onboarding.show && !onboarding.isComplete ? (
        <div className="onboardingHero">
          <GuidedOnboardingPanel
            currentStep={onboarding.currentStep}
            onComplete={() => {
              window.localStorage.setItem(STORAGE_ONBOARDED, "1");
              window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
              onboarding.setShow(false);
              ui.setStatus("Welcome aboard—onboarding complete!");
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
              ui.setStatus("Onboarding complete—you can connect Home Assistant anytime from Household.");
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
              ui.setStatus("Understood—we will skip the guided intro.");
            }}
            onFinishSetup={() => {
              onboarding.setShow(false);
              window.localStorage.setItem(STORAGE_ONBOARDED, "1");
              window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
              ui.setStatus("Welcome aboard—intro marked complete.");
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
            />
          </div>
        </div>
        <div>
          <NotesPanel
            onFetchNotes={data.fetchNotesOnly}
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
            onRefresh={data.fetchRemindersOnly}
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
          />
        </div>
      </div>
    </main>
  );
}
