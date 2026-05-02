import { useState } from "react";
import type { HaDeviceRow } from "../../types";
import { getErrorMessage } from "../../lib/errors";

type Props = {
  devices: HaDeviceRow[];
  onDone: () => Promise<void>;
  onError: (message: string) => void;
};

export function RuleForm({ devices, onDone, onError }: Props): JSX.Element {
  const [name, setName] = useState("Morning check");
  const [at, setAt] = useState("08:00");
  const [actionType, setActionType] = useState<"localReminder" | "haToggle">("localReminder");
  const [text, setText] = useState("Check your agenda");
  const [entityId, setEntityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="row">
      <input aria-label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <input aria-label="Rule trigger time" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <select
        aria-label="Rule action type"
        value={actionType}
        onChange={(e) => setActionType(e.target.value as "localReminder" | "haToggle")}
      >
        <option value="localReminder">Create reminder</option>
        <option value="haToggle">Toggle device</option>
      </select>
      {actionType === "localReminder" ? (
        <input
          aria-label="Reminder text to create"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reminder text to create"
        />
      ) : (
        <select aria-label="Device to toggle" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          <option value="">Select device</option>
          {devices.map((d) => (
            <option key={d.entityId} value={d.entityId}>
              {d.friendlyName}
            </option>
          ))}
        </select>
      )}
      <button
        disabled={isSubmitting}
        onClick={async () => {
          try {
            setIsSubmitting(true);
            if (!name.trim()) throw new Error("Rule name is required.");
            if (!at) throw new Error("Choose a time for this rule.");
            if (actionType === "localReminder" && !text.trim())
              throw new Error("Reminder text is required for reminder actions.");
            if (actionType === "haToggle" && !entityId) throw new Error("Select a device for haToggle actions.");
            await window.assistantApi.createRule({
              name: name.trim(),
              triggerConfig: { at },
              actionType,
              actionConfig: actionType === "localReminder" ? { text: text.trim() } : { entityId },
              enabled: true
            });
            setName("Morning check");
            setAt("08:00");
            setText("Check your agenda");
            setEntityId("");
            await onDone();
          } catch (err) {
            onError(getErrorMessage(err));
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        {isSubmitting ? "Adding..." : "Add Rule"}
      </button>
    </div>
  );
}
