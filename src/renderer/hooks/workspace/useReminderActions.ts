import { getErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useReminderActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  async function snoozeReminderMinutes(id: string, minutes: number, okMessage: string): Promise<void> {
    try {
      await window.assistantApi.snoozeReminder(id, minutes);
      setStatus(okMessage);
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function completeReminderById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeReminder(id);
      setStatus("Marked that follow-up as done.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteReminderById(id: string): Promise<void> {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await window.assistantApi.deleteReminder(id);
      setStatus("Follow-up deleted.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return { snoozeReminderMinutes, completeReminderById, deleteReminderById };
}
