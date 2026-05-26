import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingPanel } from "./OnboardingPanel";

describe("OnboardingPanel", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <OnboardingPanel
        visible={false}
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders local-first copy and sample actions", () => {
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={vi.fn()}
      />
    );

    expect(screen.getByText(/capture notes, manage tasks, set reminders/)).toBeInTheDocument();
    expect(screen.getByText(/Home Assistant is optional/)).toBeInTheDocument();
    expect(screen.getByText("Sample note")).toBeInTheDocument();
    expect(screen.getByText("Sample task")).toBeInTheDocument();
    expect(screen.getByText("Sample reminder")).toBeInTheDocument();
    expect(screen.getByText("Commands")).toBeInTheDocument();
  });

  it("shows Home Assistant as optional when not ready", () => {
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={vi.fn()}
      />
    );

    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("shows Home Assistant as ready when linked", () => {
    render(
      <OnboardingPanel
        visible
        haReady
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={vi.fn()}
      />
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });

  it("calls onRunPreset for sample task", () => {
    const onRunPreset = vi.fn();
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={onRunPreset}
      />
    );

    screen.getByText("Sample task").click();
    expect(onRunPreset).toHaveBeenCalledWith("capture task plan groceries");
  });

  it("calls onRunPreset for sample note", () => {
    const onRunPreset = vi.fn();
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={onRunPreset}
      />
    );

    screen.getByText("Sample note").click();
    expect(onRunPreset).toHaveBeenCalledWith("capture note check water filter");
  });

  it("calls onRunPreset for sample reminder", () => {
    const onRunPreset = vi.fn();
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={0}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={onRunPreset}
      />
    );

    screen.getByText("Sample reminder").click();
    expect(onRunPreset).toHaveBeenCalledWith("capture reminder stretch in 10m");
  });

  it("enables Done button after a command is run", () => {
    render(
      <OnboardingPanel
        visible
        haReady={false}
        commandHistoryLength={1}
        onHideForNow={vi.fn()}
        onFinishSetup={vi.fn()}
        onRunPreset={vi.fn()}
      />
    );

    const doneButton = screen.getByRole("button", { name: "Done" });
    expect(doneButton).not.toBeDisabled();
  });
});
