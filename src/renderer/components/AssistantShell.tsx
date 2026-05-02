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
  const { ui, data, ha, command, calendar, reminders, memos, profile, onboarding, desk } = useAssistantWorkspace();

  return (
    <main className="container secretaryLayout">
      <AppHeader
        theme={ui.theme}
        onThemeChange={ui.setTheme}
        userPreferredName={profile.userPreferredName}
        userPreferredNameIsSet={profile.userPreferredNameIsSet}
        onSaveUserPreferredName={profile.persistUserPreferredName}
        notesCount={data.notes.length}
        pendingRemindersCount={reminders.pending.length}
        overdueRemindersCount={reminders.overdue.length}
        haReady={ha.haReady}
      />

      <StatusBanner status={ui.status} error={ui.error} />

      <div className="secretaryDesk">
        <div
          className={
            onboarding.show ? "secretaryTriple secretaryTriple-withIntro" : "secretaryTriple secretaryTriple-compact"
          }
        >
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

        <div className="grid secretaryMemosGrid">
          <NotesPanel
            onFetchNotes={data.fetchNotesOnly}
            onError={ui.reportError}
            onDeleteNote={(id, title) => void memos.deleteNote(id, title)}
            onUpdateNote={(payload) => void memos.updateNote(payload)}
          />
          <RemindersPanel
            isRefreshing={data.isRefreshing}
            reminderFilter={reminders.filter}
            setReminderFilter={reminders.setFilter}
            visibleReminders={reminders.visible}
            onRefresh={data.fetchRemindersOnly}
            onError={ui.reportError}
            onSnooze10={(id) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
            onSnooze60={(id) => void reminders.snoozeMinutes(id, 60, "Snoozed 1h.")}
            onComplete={(id) => void reminders.completeById(id)}
            onDelete={(id) => void reminders.deleteById(id)}
          />
        </div>
      </div>
    </main>
  );
}
