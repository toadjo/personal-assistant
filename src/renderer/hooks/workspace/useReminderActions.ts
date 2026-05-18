import { getAssistantInvokeErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

export function useReminderActions(setStatus: SetStatus, setError: SetError, refreshReminders: () => Promise<void>) {
  async function snoozeReminderMinutes(id: string, minutes: number, okMessage: string): Promise<void> {
    try {
      await window.assistantApi.snoozeReminder(id, minutes);
      setStatus(okMessage);
      await refreshReminders();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshReminders();
    }
  }

  async function completeReminderById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeReminder(id);
      setStatus("Marked that follow-up as done.");
      await refreshReminders();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshReminders();
    }
  }

  async function deleteReminderById(id: string): Promise<void> {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await window.assistantApi.deleteReminder(id);
      setStatus("Follow-up deleted.");
      await refreshReminders();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshReminders();
    }
  }

  async function updateReminderById(id: string, text?: string, dueAt?: string): Promise<void> {
    try {
      await window.assistantApi.updateReminder({ id, text, dueAt });
      setStatus("Reminder updated.");
      await refreshReminders();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      await refreshReminders();
    }
  }

  return { snoozeReminderMinutes, completeReminderById, deleteReminderById, updateReminderById };
}
