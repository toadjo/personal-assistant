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
  { command: "capture note project update", label: "Capture note" },
  { command: "capture task review budget", label: "Capture task" },
  { command: "capture reminder follow-up in 1h", label: "Capture reminder" },
  { command: "find overdue", label: "Find overdue" },
  { command: "plan today", label: "Plan today" }
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
