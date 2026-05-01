import type { FormEvent } from "react";
import { useState } from "react";
import { getErrorMessage } from "../../lib/errors";
import { parseLocalDateTimeInput, toLocalDateTimeInputValue } from "../../lib/dateTime";

type Props = {
  onDone: () => Promise<void>;
  onError: (message: string) => void;
};

export function ReminderForm({ onDone, onError }: Props): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (!text.trim()) throw new Error("Reminder text is required.");
      const parsedDueAt = parseLocalDateTimeInput(dueAt);
      if (new Date(parsedDueAt).getTime() < Date.now() + 30_000) {
        throw new Error("Reminder time must be at least 30 seconds in the future.");
      }
      await window.assistantApi.createReminder({ text: text.trim(), dueAt: parsedDueAt, recurrence: "none" });
      setText("");
      setDueAt(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="row" onSubmit={(event) => void handleSubmit(event)}>
      <input aria-label="Reminder text" placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <input
        aria-label="Reminder date and time"
        type="datetime-local"
        value={dueAt}
        min={toLocalDateTimeInputValue(new Date(Date.now() + 60_000))}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Scheduling..." : "Schedule"}
      </button>
    </form>
  );
}
