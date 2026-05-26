import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AssistantShell } from "./AssistantShell";

describe("AssistantShell - Preload Bridge Missing", () => {
  beforeEach(() => {
    // Store the original assistantApi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._originalAssistantApi = (window as any).assistantApi;
    // Remove assistantApi to simulate missing preload bridge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).assistantApi;
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
  });

  it("should render without throwing when preload bridge is missing", () => {
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
});
