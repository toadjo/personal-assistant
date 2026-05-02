import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { AppHeader } from "./layout/AppHeader";
import { StatusBanner } from "./layout/StatusBanner";
import { OnboardingPanel } from "./panels/OnboardingPanel";
import { CommandPanel } from "./panels/CommandPanel";
import { CalendarPanel } from "./panels/CalendarPanel";
import { NotesPanel } from "./panels/NotesPanel";
import { RemindersPanel } from "./panels/RemindersPanel";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../constants/storageKeys";

export function AssistantShell(): JSX.Element {
  const ws = useAssistantWorkspace();

  return (
    <main className="container secretaryLayout">
      <AppHeader
        theme={ws.theme}
        onThemeChange={ws.setTheme}
        userPreferredName={ws.userPreferredName}
        userPreferredNameIsSet={ws.userPreferredNameIsSet}
        onSaveUserPreferredName={ws.persistUserPreferredName}
        notesCount={ws.notes.length}
        pendingRemindersCount={ws.pendingReminders.length}
        overdueRemindersCount={ws.overdueReminders.length}
        haReady={ws.haReady}
      />

      <StatusBanner status={ws.status} error={ws.error} />

      <div className="secretaryDesk">
        <div
          className={
            ws.showOnboarding ? "secretaryTriple secretaryTriple-withIntro" : "secretaryTriple secretaryTriple-compact"
          }
        >
          <OnboardingPanel
            visible={ws.showOnboarding}
            haReady={ws.haReady}
            commandHistoryLength={ws.commandHistory.length}
            onHideForNow={() => {
              window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
              ws.setShowOnboarding(false);
              ws.setStatus("Understood—we will skip the guided intro.");
            }}
            onFinishSetup={() => {
              ws.setShowOnboarding(false);
              window.localStorage.setItem(STORAGE_ONBOARDED, "1");
              window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
              ws.setStatus("Welcome aboard—intro marked complete.");
            }}
            onRunPreset={ws.runPresetCommand}
          />

          <CommandPanel
            commandInputRef={ws.commandInputRef}
            query={ws.query}
            reminderFilter={ws.reminderFilter}
            haReady={ws.haReady}
            commandInput={ws.commandInput}
            setCommandInput={ws.setCommandInput}
            commandHints={ws.commandHints}
            commandHistory={ws.commandHistory}
            historyCursor={ws.historyCursor}
            setHistoryCursor={ws.setHistoryCursor}
            isRunningCommand={ws.isRunningCommand}
            onRunCommand={ws.runCommandInternal}
            onClearHistory={ws.clearCommandHistory}
            onClearNoteSearch={() => ws.setQuery("")}
            onPreset={ws.runPresetCommand}
            onHideDeskIfInputEmpty={ws.hideDeskWindow}
          />

          <CalendarPanel
            calendarCursor={ws.calendarCursor}
            setCalendarCursor={ws.setCalendarCursor}
            monthCells={ws.monthCells}
            todayKey={ws.todayKey}
            selectedDateKey={ws.calendarSelectedKey}
            onSelectDateKey={ws.setCalendarSelectedKey}
            dayAgenda={ws.selectedDayAgenda}
          />
        </div>

        <div className="grid secretaryMemosGrid">
          <NotesPanel
            isRefreshing={ws.isRefreshing}
            notes={ws.notes}
            onRefresh={ws.refreshAll}
            onError={ws.reportError}
            onDeleteNote={(id, title) => void ws.deleteNote(id, title)}
            onUpdateNote={(payload) => void ws.updateNote(payload)}
          />
          <RemindersPanel
            isRefreshing={ws.isRefreshing}
            reminderFilter={ws.reminderFilter}
            setReminderFilter={ws.setReminderFilter}
            visibleReminders={ws.visibleReminders}
            onRefresh={ws.refreshAll}
            onError={ws.reportError}
            onSnooze10={(id) => void ws.snoozeReminderMinutes(id, 10, "Snoozed 10m.")}
            onSnooze60={(id) => void ws.snoozeReminderMinutes(id, 60, "Snoozed 1h.")}
            onComplete={(id) => void ws.completeReminderById(id)}
            onDelete={(id) => void ws.deleteReminderById(id)}
          />
        </div>
      </div>
    </main>
  );
}
