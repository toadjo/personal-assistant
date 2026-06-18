import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { AiSettingsPanel } from "./AiSettingsPanel";
import type { AiConfigStatus } from "../../../shared/ai/types";
import { encodeAssistantInvokeFailure } from "../../../shared/invokeErrors";

describe("AiSettingsPanel", () => {
  const mockConfig: AiConfigStatus = {
    provider: "openai",
    configured: true,
    lastTestedAt: "2024-01-01T00:00:00Z"
  };

  const mockSetKey = vi.fn().mockResolvedValue(mockConfig);
  const mockClearKey = vi.fn().mockResolvedValue({ provider: null, configured: false, lastTestedAt: null });
  const mockTestKey = vi.fn().mockResolvedValue({ success: true, model: "gpt-4o-mini" });
  const mockRefresh = vi.fn().mockResolvedValue(mockConfig);
  const mockOnClose = vi.fn();

  it("renders configured state when provider is set", () => {
    render(
      <AiSettingsPanel
        config={mockConfig}
        onSetKey={mockSetKey}
        onClearKey={mockClearKey}
        onTestKey={mockTestKey}
        onRefresh={mockRefresh}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("AI Configuration")).toBeInTheDocument();
    expect(screen.getByText("Provider:")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Test connection")).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
    expect(
      screen.getByText("AI is connected. Type natural-language requests in the command box above.")
    ).toBeInTheDocument();
  });

  it("renders unconfigured state when provider is not set", () => {
    render(
      <AiSettingsPanel
        config={null}
        onSetKey={mockSetKey}
        onClearKey={mockClearKey}
        onTestKey={mockTestKey}
        onRefresh={mockRefresh}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("AI Configuration")).toBeInTheDocument();
    expect(screen.getByText("Select provider...")).toBeInTheDocument();
    expect(screen.getByText("API key:")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("shows last tested date when available", () => {
    render(
      <AiSettingsPanel
        config={mockConfig}
        onSetKey={mockSetKey}
        onClearKey={mockClearKey}
        onTestKey={mockTestKey}
        onRefresh={mockRefresh}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Last tested:")).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    render(
      <AiSettingsPanel
        config={mockConfig}
        onSetKey={mockSetKey}
        onClearKey={mockClearKey}
        onTestKey={mockTestKey}
        onRefresh={mockRefresh}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText("Close");
    closeButton.click();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows decoded provider errors from connection test", async () => {
    const failingTestKey = vi.fn().mockRejectedValue(
      encodeAssistantInvokeFailure({
        domain: "ai",
        code: "RATE_LIMITED",
        message: "OpenAI rate limit exceeded.",
        retryable: true
      })
    );

    render(
      <AiSettingsPanel
        config={mockConfig}
        onSetKey={mockSetKey}
        onClearKey={mockClearKey}
        onTestKey={failingTestKey}
        onRefresh={mockRefresh}
        onClose={mockOnClose}
      />
    );

    await act(async () => {
      screen.getByText("Test connection").click();
    });

    await waitFor(() => {
      expect(screen.getByText("OpenAI rate limit exceeded. You can try again in a moment.")).toBeInTheDocument();
    });
  });
});
