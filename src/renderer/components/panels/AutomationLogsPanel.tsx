import type { ExecutionLogRow } from "../../types";
import { Activity } from "lucide-react";
import { formatRetrySummary } from "../../lib/format";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";

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
          <li className="muted">Loading…</li>
        ) : logs.length ? (
          logs.map((l) => (
            <li key={l.id}>
              <strong>{l.status.toUpperCase()}</strong> · {new Date(l.startedAt).toLocaleString()} ·{" "}
              {formatRetrySummary(l.attemptCount, l.retryCount)}
              {l.error ? ` — ${l.error}` : ""}
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
