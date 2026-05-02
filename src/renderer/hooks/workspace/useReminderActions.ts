import { getErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (message: string) => void;

export function useReminderActions(setStatus: SetStatus, setError: SetError, fetchRemindersOnly: () => Promise<void>) {
  async function snoozeReminderMinutes(id: string, minutes: number, okMessage: string): Promise<void> {
    try {
      await window.assistantApi.snoozeReminder(id, minutes);
      setStatus(okMessage);
      await fetchRemindersOnly();
    } catch (err) {
      setError(getErrorMessage(err));
      await fetchRemindersOnly();
    }
  }

  async function completeReminderById(id: string): Promise<void> {
    try {
      await window.assistantApi.completeReminder(id);
      setStatus("Marked that follow-up as done.");
      await fetchRemindersOnly();
    } catch (err) {
      setError(getErrorMessage(err));
      await fetchRemindersOnly();
    }
  }

  async function deleteReminderById(id: string): Promise<void> {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await window.assistantApi.deleteReminder(id);
      setStatus("Follow-up deleted.");
      await fetchRemindersOnly();
    } catch (err) {
      setError(getErrorMessage(err));
      await fetchRemindersOnly();
    }
  }

  return { snoozeReminderMinutes, completeReminderById, deleteReminderById };
}
