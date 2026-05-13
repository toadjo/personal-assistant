import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPanel } from "./AboutPanel";

function mockOpenBugReport(resolution: Promise<boolean> = Promise.resolve(true)) {
  const original = window.assistantApi;
  window.assistantApi = {
    ...original,
    openBugReport: vi.fn(() => resolution)
  } as unknown as typeof window.assistantApi;
  return original;
}

describe("AboutPanel", () => {
  it("renders version from props", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByText("PersonalAssistant 1.4.3")).toBeInTheDocument();
  });

  it("renders local-first description", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByText(/notes, tasks, reminders/)).toBeInTheDocument();
  });

  it("renders close button when onClose is provided", () => {
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not render close button when onClose is omitted", () => {
    render(<AboutPanel version="1.4.3" />);
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("clicking Report a bug calls window.assistantApi.openBugReport", () => {
    const original = mockOpenBugReport();
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    expect(window.assistantApi.openBugReport).toHaveBeenCalledTimes(1);
    window.assistantApi = original;
  });

  it("shows error message if openBugReport rejects", async () => {
    const original = mockOpenBugReport(Promise.reject(new Error("fail")));
    render(<AboutPanel version="1.4.3" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    await waitFor(() => expect(screen.getByText(/Could not open GitHub issues/)).toBeInTheDocument());
    window.assistantApi = original;
  });
});
