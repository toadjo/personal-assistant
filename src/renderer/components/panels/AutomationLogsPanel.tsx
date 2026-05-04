import type { ExecutionLogRow } from "../../types";
import { formatRetrySummary } from "../../lib/format";

type Props = {
  isRefreshing: boolean;
  logs: ExecutionLogRow[];
};

export function AutomationLogsPanel({ isRefreshing, logs }: Props): JSX.Element {
  return (
    <section className="panel addOnPanel">
      <div className="titleRow">
        <h3 className="panelSectionHeading">Rule runs</h3>
      </div>
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
          <li className="emptyState">
            <p className="emptyStateTitle">No runs yet</p>
            <p className="emptyStateDescription">
              Rule runs appear here after automation rules execute. Create a rule to see its execution history.
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}
