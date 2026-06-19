import { lazy, Suspense } from "react";
import { HomeDashboardPanel } from "../panels/HomeDashboardPanel";
import { CalendarPanel } from "../panels/CalendarPanel";
import { CommandPanel } from "../panels/CommandPanel";
import { TodayStrip } from "../layout/TodayStrip";
import { PlanTodayPanel } from "../panels/PlanTodayPanel";
import { DailyCommandCenterPanel } from "../panels/DailyCommandCenterPanel";
import { EndOfDayReviewPanel } from "../panels/EndOfDayReviewPanel";
import { InboxPanel } from "../panels/InboxPanel";
import { NotesPanel } from "../panels/NotesPanel";
import { RemindersPanel } from "../panels/RemindersPanel";
import { TasksPanel } from "../panels/TasksPanel";
import { LoadingState } from "../life-areas/LoadingState";
import { setAutomationFocusIntent } from "../../lib/automation-focus-intent";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { PersonalModule } from "../../hooks/shell/useShellNav";
import type { ShellDerivedState } from "../../hooks/shell/useShellDerivedState";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";
import type { TeamState } from "../../hooks/team/useTeamState";
import type { BriefItem } from "../../types";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";

const FinancePanel = lazy(() => import("../panels/FinancePanel").then((m) => ({ default: m.FinancePanel })));
const CarPanel = lazy(() => import("../panels/CarPanel").then((m) => ({ default: m.CarPanel })));
const FamilyPanel = lazy(() => import("../panels/FamilyPanel").then((m) => ({ default: m.FamilyPanel })));
const HealthPanel = lazy(() => import("../panels/HealthPanel").then((m) => ({ default: m.HealthPanel })));
const HobbiesPanel = lazy(() => import("../panels/HobbiesPanel").then((m) => ({ default: m.HobbiesPanel })));

export type ShellModuleRouterProps = {
  active: PersonalModule;
  workspace: AssistantWorkspace;
  team: TeamState;
  derived: ShellDerivedState;
  showEndOfDayReview: boolean;
  aiConfigured: boolean;
  teamOpenCount: number | undefined;
  teamAttentionCount: number | undefined;
  onSelectModule: (m: PersonalModule) => void;
  onOpenHousehold: () => void;
  onOpenBriefItem: (brief: BriefItem) => void;
  onOpenWorkItem: (item: UnifiedWorkItem) => void;
  onReviewDay: () => void;
  onSetDailyCommandCenterFilter: (f: import("../../lib/derived/daily-command-center").DailyCommandCenterFilter) => void;
  onSetStatus: (msg: string) => void;
};

export function ShellModuleRouter({
  active,
  workspace,
  team,
  derived,
  showEndOfDayReview,
  aiConfigured,
  teamOpenCount,
  teamAttentionCount,
  onSelectModule,
  onOpenHousehold,
  onOpenBriefItem,
  onOpenWorkItem,
  onReviewDay,
  onSetDailyCommandCenterFilter,
  onSetStatus
}: ShellModuleRouterProps): JSX.Element | null {
  const { ui, data, ha, command, calendar, reminders, tasks, memos, onboarding, desk, display, inbox } =
    workspace;
  const { dailyCommandCenter, planTodayQueue, endOfDayReview, markSeen } = derived;

  if (active === "home") {
    return (
      <>
        <HomeDashboardPanel
          data={dailyCommandCenter}
          onOpenToday={() => onSelectModule("today")}
          onOpenInbox={() => onSelectModule("inbox")}
          onOpenWorkItem={onOpenBriefItem}
          onOpenAutomations={(briefItem) => {
            if (briefItem.kind === "automation") {
              setAutomationFocusIntent(briefItem.sourceId);
            }
            onOpenHousehold();
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
              selectedDayExternalEvents={calendar.selectedDayExternalEvents}
              calendarSourceFilter={calendar.calendarSourceFilter}
              onCalendarSourceFilterChange={calendar.setCalendarSourceFilter}
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
                aiConfigured={aiConfigured}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (active === "today") {
    return (
      <>
        <TodayStrip
          overdueCount={tasks.overdueOpen.length}
          dueTodayCount={tasks.dueTodayOpen.length}
          remindersCount={reminders.pending.length}
          notesCount={data.notes.length}
          automationsCount={data.rules.length}
          teamOpenCount={teamOpenCount}
          teamAttentionCount={teamAttentionCount}
          onFilterOverdue={() => {
            onSelectModule("tasks");
            tasks.setFilter("overdue");
          }}
          onFilterDueToday={() => {
            onSelectModule("tasks");
            tasks.setFilter("open");
          }}
          onFilterReminders={() => onSelectModule("reminders")}
          onFilterNotes={() => onSelectModule("memos")}
          onFilterAutomations={() => onOpenHousehold()}
          onFilterTeam={() => {
            onSetDailyCommandCenterFilter("team");
            onSetStatus("Showing team tasks.");
          }}
          onReviewDay={onReviewDay}
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
          onOpenWorkItem={onOpenBriefItem}
          onOpenInbox={() => onSelectModule("inbox")}
          onShowSuccess={ui.showSuccess}
          onError={ui.reportError}
        />

        <DailyCommandCenterPanel
          data={dailyCommandCenter}
          showAllSecondary={display.dccShowAllSecondary}
          onCompleteTask={tasks.completeById}
          onCompleteReminder={reminders.completeById}
          onSnoozeReminder={(id: string) => void reminders.snoozeMinutes(id, 10, "Snoozed 10m.")}
          onMarkSeen={markSeen}
          onOpenTasks={() => onSelectModule("tasks")}
          onOpenReminders={() => onSelectModule("reminders")}
          onOpenNotes={() => onSelectModule("memos")}
          onOpenAutomations={(briefItem) => {
            if (briefItem.kind === "automation") {
              setAutomationFocusIntent(briefItem.sourceId);
            }
            onOpenHousehold();
          }}
          onOpenWorkItem={onOpenBriefItem}
          onOpenInbox={() => onSelectModule("inbox")}
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
            onOpenWorkItem={onOpenBriefItem}
            onShowSuccess={ui.showSuccess}
            onError={ui.reportError}
          />
        )}
      </>
    );
  }

  if (active === "inbox") {
    return (
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
        onOpenItem={onOpenWorkItem}
        onOpenToday={() => onSelectModule("today")}
        onShowSuccess={ui.showSuccess}
        onError={ui.reportError}
      />
    );
  }

  if (active === "memos") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <NotesPanel
            notes={data.notes}
            isRefreshing={data.isFetching}
            onFetchNotes={data.refreshNotes}
            onError={ui.reportError}
            onShowSuccess={ui.showSuccess}
            onDeleteNote={(id, title) => void memos.deleteNote(id, title)}
            onUpdateNote={(payload) => void memos.updateNote(payload)}
            onNoteCreated={() => onboarding.markNoteCreated()}
          />
        </div>
      </div>
    );
  }

  if (active === "reminders") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <RemindersPanel
            isRefreshing={data.isFetching}
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
    );
  }

  if (active === "tasks") {
    return (
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
    );
  }

  if (active === "lifeAreas") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <div className="emptyState">
            <h2>Life Areas</h2>
            <p>Track your personal development across different life areas.</p>
          </div>
        </div>
      </div>
    );
  }

  if (active === "finance") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <Suspense fallback={<LoadingState message="Loading Finance..." />}>
            <FinancePanel
              isRefreshing={data.isFetching}
              onRefresh={data.refreshAll}
              onError={ui.reportError}
              onShowSuccess={ui.showSuccess}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (active === "car") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <Suspense fallback={<LoadingState message="Loading Car..." />}>
            <CarPanel
              isRefreshing={data.isFetching}
              onRefresh={data.refreshAll}
              onError={ui.reportError}
              onShowSuccess={ui.showSuccess}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (active === "family") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <Suspense fallback={<LoadingState message="Loading Family..." />}>
            <FamilyPanel
              isRefreshing={data.isFetching}
              onRefresh={data.refreshAll}
              onError={ui.reportError}
              onShowSuccess={ui.showSuccess}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (active === "health") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <Suspense fallback={<LoadingState message="Loading Health..." />}>
            <HealthPanel
              isRefreshing={data.isFetching}
              onRefresh={data.refreshAll}
              onError={ui.reportError}
              onShowSuccess={ui.showSuccess}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (active === "hobbies") {
    return (
      <div className="contentGrid">
        <div className="contentMain">
          <Suspense fallback={<LoadingState message="Loading Hobbies..." />}>
            <HobbiesPanel
              isRefreshing={data.isFetching}
              onRefresh={data.refreshAll}
              onError={ui.reportError}
              onShowSuccess={ui.showSuccess}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return null;
}
