import type { ExecutionLogRow } from "../../types";
import { formatRetrySummary } from "../../lib/format";

type Props = {
  isRefreshing: boolean;
  logs: ExecutionLogRow[];
};

export function AutomationLogsPanel({ isRefreshing, logs }: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Automation Logs</h2>
        <span className="pill graphitePill">History</span>
      </div>
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading logs...</li>
        ) : logs.length ? (
          logs.map((l) => (
            <li key={l.id}>
              <strong>{l.status.toUpperCase()}</strong> - {new Date(l.startedAt).toLocaleString()} - {formatRetrySummary(l.attemptCount, l.retryCount)}{" "}
              {l.error ? `- ${l.error}` : ""}
            </li>
          ))
        ) : (
          <li className="muted">No execution logs yet.</li>
        )}
      </ul>
    </section>
  );
}
