import type { ExecutionLogRow } from "../../types";
import { Activity } from "lucide-react";
import { formatRetrySummary } from "../../lib/format";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";

function formatLogError(error?: string): string {
  if (!error) return "";
  // Strip verbose JSON prefix and rule label bracket if present for concise display
  const cleaned = error
    .replace(/^\[[^\]]+\]\s*/, "") // remove [Rule Name] prefix
    .replace(/^assistant:invoke:v1:/, ""); // remove any raw prefix
  return cleaned;
}

type Props = {
  isRefreshing: boolean;
  logs: ExecutionLogRow[];
};

export function AutomationLogsPanel({ isRefreshing, logs }: Props): JSX.Element {
  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Activity} title="Automation log" />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading...</li>
        ) : logs.length ? (
          logs.map((l) => (
            <li key={l.id}>
              <span className={l.status === "success" ? "successText" : l.status === "failed" ? "errorText" : ""}>
                {l.status.toUpperCase()}
              </span>
              {" - "}
              {new Date(l.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" - "}
              {l.actionLabel || "Run action"}
              {l.retryCount > 0 ? ` - ${formatRetrySummary(l.attemptCount, l.retryCount)}` : ""}
              {l.error ? ` - ${formatLogError(l.error)}` : ""}
            </li>
          ))
        ) : (
          <EmptyState
            icon={Activity}
            title="No runs yet"
            description="Execution history appears here after a rule runs."
          />
        )}
      </ul>
    </section>
  );
}
