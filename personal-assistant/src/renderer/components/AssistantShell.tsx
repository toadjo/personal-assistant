import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { AppHeader } from "./layout/AppHeader";
import { StatusBanner } from "./layout/StatusBanner";
import { OnboardingPanel } from "./panels/OnboardingPanel";
import { CommandPanel } from "./panels/CommandPanel";
import { CalendarPanel } from "./panels/CalendarPanel";
import { NotesPanel } from "./panels/NotesPanel";
import { RemindersPanel } from "./panels/RemindersPanel";
import { HomeAssistantPanel } from "./panels/HomeAssistantPanel";
import { AutomationLogsPanel } from "./panels/AutomationLogsPanel";
import { AutomationRulesPanel } from "./panels/AutomationRulesPanel";
import { STORAGE_ONBOARDED } from "../constants/storageKeys";

export function AssistantShell(): JSX.Element {
  const ws = useAssistantWorkspace();

  return (
    <main className="container secretaryLayout">
      <AppHeader
        theme={ws.theme}
        onToggleTheme={() => ws.setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        notesCount={ws.notes.length}
        pendingRemindersCount={ws.pendingReminders.length}
        overdueRemindersCount={ws.overdueReminders.length}
        haReady={ws.haReady}
      />

      <StatusBanner status={ws.status} error={ws.error} />

      <OnboardingPanel
        visible={ws.showOnboarding}
        haReady={ws.haReady}
        commandHistoryLength={ws.commandHistory.length}
        onHideForNow={() => {
          ws.setShowOnboarding(false);
          ws.setStatus("Skipped intro.");
        }}
        onFinishSetup={() => {
          ws.setShowOnboarding(false);
          window.localStorage.setItem(STORAGE_ONBOARDED, "1");
          ws.setStatus("Intro complete.");
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
      />

      <CalendarPanel
        calendarCursor={ws.calendarCursor}
        setCalendarCursor={ws.setCalendarCursor}
        monthCells={ws.monthCells}
        todayKey={ws.todayKey}
        todayAgenda={ws.todayAgenda}
      />

      <div className="grid">
        <NotesPanel
          isRefreshing={ws.isRefreshing}
          notes={ws.notes}
          onRefresh={ws.refreshAll}
          onError={ws.reportError}
          onDeleteNote={(id, title) => void ws.deleteNote(id, title)}
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

      <HomeAssistantPanel
        haUrl={ws.haUrl}
        setHaUrl={ws.setHaUrl}
        haToken={ws.haToken}
        setHaToken={ws.setHaToken}
        hasHaUrl={ws.hasHaUrl}
        haStatusText={ws.haStatusText}
        haReady={ws.haReady}
        canSaveHa={ws.canSaveHa}
        isSavingHa={ws.isSavingHa}
        isRefreshingHa={ws.isRefreshingHa}
        isRefreshing={ws.isRefreshing}
        devices={ws.devices}
        isEntityTogglePending={ws.isEntityTogglePending}
        onSave={() => void ws.saveHomeAssistantConfig()}
        onTest={() => void ws.testHomeAssistant()}
        onRefreshEntities={() => void ws.refreshHomeAssistantEntities()}
        onToggleDevice={ws.runDeviceToggle}
        onError={ws.reportError}
      />

      <div className="grid">
        <AutomationRulesPanel
          isRefreshing={ws.isRefreshing}
          rules={ws.rules}
          devices={ws.devices}
          onRefresh={ws.refreshAll}
          onError={ws.reportError}
        />
        <AutomationLogsPanel isRefreshing={ws.isRefreshing} logs={ws.logs} />
      </div>
    </main>
  );
}
