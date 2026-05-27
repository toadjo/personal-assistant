import { WorkItemDetailDrawer } from "../WorkItemDetailDrawer";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";
import type { TeamState } from "../../hooks/team/useTeamState";

export type ShellWorkItemDrawerProps = {
  item: UnifiedWorkItem | null;
  onClose: () => void;
  workspace: AssistantWorkspace;
  team: TeamState;
};

export function ShellWorkItemDrawer({
  item,
  onClose,
  workspace,
  team
}: ShellWorkItemDrawerProps): JSX.Element | null {
  if (!item) {
    return null;
  }

  const { ui, tasks, reminders, memos, inbox } = workspace;

  return (
    <WorkItemDetailDrawer
      item={item}
      onClose={onClose}
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
  );
}
