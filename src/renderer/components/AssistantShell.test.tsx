import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssistantShell } from "./AssistantShell";

describe("AssistantShell - Preload Bridge Missing", () => {
  beforeEach(() => {
    // Store the original assistantApi and __APP_VERSION__
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._originalAssistantApi = (window as any).assistantApi;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__APP_VERSION__ = "2.1.4";
  });

  afterEach(() => {
    cleanup();
    // Restore the original assistantApi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any)._originalAssistantApi) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).assistantApi = (window as any)._originalAssistantApi;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)._originalAssistantApi;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).__APP_VERSION__;
  });

  it("should not crash when window.assistantApi is missing", () => {
    // Delete the assistantApi to simulate missing preload bridge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).assistantApi;

    // Render should not throw
    expect(() => {
      render(<AssistantShell />);
    }).not.toThrow();

    // ErrorBoundary fallback text should not be present
    expect(screen.queryByText(/The desk hit a snag/i)).not.toBeInTheDocument();
  });

  it("should show preload bridge missing message when attempting to open Household window", () => {
    // Delete the assistantApi to simulate missing preload bridge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).assistantApi;

    render(<AssistantShell />);

    // Find the Home Assistant button and click it
    const homeButton = screen.getByLabelText(/Home Assistant/i);
    homeButton.click();

    // The preload bridge missing message should appear in the error/status path
    // This is handled by the handleOpenHouseholdWindow helper which calls ui.reportError
    // The error should be visible in the StatusBanner
    expect(screen.getByText(/Preload bridge missing/i)).toBeInTheDocument();
  });
});
