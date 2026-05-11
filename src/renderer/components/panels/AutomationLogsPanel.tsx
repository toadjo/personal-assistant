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
      <PanelHeader icon={Activity} title="Rule runs" />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading...</li>
        ) : logs.length ? (
          logs.map((l) => (
            <li key={l.id}>
              <strong>{l.status.toUpperCase()}</strong> - {new Date(l.startedAt).toLocaleString()} -{" "}
              {l.actionLabel || "Run automation action"} - {formatRetrySummary(l.attemptCount, l.retryCount)}
              {l.error ? ` - ${formatLogError(l.error)}` : ""}
            </li>
          ))
        ) : (
          <EmptyState
            icon={Activity}
            title="No runs yet"
            description="Rule runs appear here after automation rules execute. Create a rule to see its execution history."
          />
        )}
      </ul>
    </section>
  );
}
