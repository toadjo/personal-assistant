import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutomationLogsPanel } from "./AutomationLogsPanel";
import type { ExecutionLogRow } from "../../types";

function makeLog(overrides: Partial<ExecutionLogRow> = {}): ExecutionLogRow {
  return {
    id: "log-1",
    ruleId: "rule-1",
    status: "success",
    startedAt: "2026-05-11T10:00:00.000Z",
    endedAt: "2026-05-11T10:00:01.000Z",
    attemptCount: 1,
    retryCount: 0,
    ruleName: "Test Rule",
    actionLabel: "Create reminder: Stretch",
    ...overrides
  };
}

describe("AutomationLogsPanel", () => {
  it("renders loading state", () => {
    render(<AutomationLogsPanel isRefreshing logs={[]} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders empty state when no logs", () => {
    render(<AutomationLogsPanel isRefreshing={false} logs={[]} />);
    expect(screen.getByText("No runs yet")).toBeInTheDocument();
  });

  it("renders log with status, timestamp, action label, and retry summary", () => {
    render(<AutomationLogsPanel isRefreshing={false} logs={[makeLog()]} />);
    const row = screen.getByText(/SUCCESS/);
    expect(row).toBeInTheDocument();
    // Should contain action label
    expect(screen.getByText(/Create reminder: Stretch/)).toBeInTheDocument();
    // Should contain retry summary
    expect(screen.getByText(/No retries/)).toBeInTheDocument();
  });

  it("renders failed log with error text", () => {
    const log = makeLog({
      status: "failed",
      attemptCount: 3,
      retryCount: 2,
      actionLabel: "Toggle device: switch.test",
      error: "[Test Rule] [automation:ACTION_FAILED] Simulated failure"
    });
    render(<AutomationLogsPanel isRefreshing={false} logs={[log]} />);
    expect(screen.getByRole("listitem")).toHaveTextContent(/FAILED/);
    expect(screen.getByText(/Toggle device: switch.test/)).toBeInTheDocument();
    // Error should be present but stripped of rule label prefix
    expect(screen.getByText(/\[automation:ACTION_FAILED\] Simulated failure/)).toBeInTheDocument();
    // Retry summary visible
    expect(screen.getByText(/2 retries \(3 attempts\)/)).toBeInTheDocument();
  });

  it("uses plain ASCII separators, no mojibake middle dots", () => {
    render(<AutomationLogsPanel isRefreshing={false} logs={[makeLog()]} />);
    const list = screen.getByRole("list");
    expect(list.textContent).not.toContain("\u00B7");
  });
});
