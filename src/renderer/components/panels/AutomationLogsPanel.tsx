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
          <li className="muted">No runs yet.</li>
        )}
      </ul>
    </section>
  );
}
