/**
 * Command examples component (v1.2.7).
 * Shows "Try these commands" section with context-aware examples based on Home Assistant readiness.
 */

import { Lightbulb } from "lucide-react";

type Props = {
  haReady: boolean;
  onRunPreset: (command: string) => void;
};

const BASE_EXAMPLES = [
  { command: "new note meeting with team", label: "Create a note" },
  { command: "remind standup in 30m", label: "Set a reminder" },
  { command: "list reminders", label: "Show reminders" },
  { command: "show notes", label: "Show all notes" }
];

const HA_EXAMPLES = [
  { command: "turn on living room light", label: "Toggle a device" },
  { command: "show devices", label: "List all devices" },
  { command: "open household", label: "Open Household window" }
];

export function CommandExamples({ haReady, onRunPreset }: Props): JSX.Element {
  const examples = haReady ? [...BASE_EXAMPLES, ...HA_EXAMPLES] : BASE_EXAMPLES;

  return (
    <div className="command-examples">
      <p className="examples-title">
        <Lightbulb size={11} /> Try these commands:
      </p>
      <div className="examples-grid">
        {examples.map((example) => (
          <button
            key={example.command}
            type="button"
            className="pillButton"
            onClick={() => onRunPreset(example.command)}
            title={example.command}
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
