/**
 * Command examples component.
 * Shows "Try these commands" section with context-aware examples based on Home Assistant readiness.
 */

import { Lightbulb } from "lucide-react";

type Props = {
  haReady: boolean;
  onRunPreset: (command: string) => void;
};

const BASE_EXAMPLES = [
  { command: "new note project update", label: "New note" },
  { command: "add task review budget", label: "Add task" },
  { command: "remind follow-up in 1h", label: "Set reminder" },
  { command: "show overdue tasks", label: "Overdue tasks" },
  { command: "plan tomorrow", label: "Plan ahead" }
];

const HA_EXAMPLES = [
  { command: "turn on desk light", label: "Toggle device" },
  { command: "show devices", label: "Devices" }
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
