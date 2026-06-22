import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { OnboardingFlow } from "./OnboardingFlow";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";

type OnboardingSlice = AssistantWorkspace["onboarding"];

function makeOnboarding(overrides: Partial<OnboardingSlice> = {}): OnboardingSlice {
  return {
    show: true,
    guidedState: {
      status: "inProgress",
      step: "note",
      progress: {
        noteCreated: false,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      }
    },
    currentStep: "note",
    isComplete: false,
    markNoteCreated: vi.fn(),
    markReminderCreated: vi.fn(),
    markHomeAssistantConnected: vi.fn(),
    skipHomeAssistant: vi.fn(),
    defer: vi.fn(),
    complete: vi.fn(),
    reset: vi.fn(),
    ...overrides
  };
}

function makeProps(onboardingOverrides: Partial<OnboardingSlice> = {}) {
  return {
    onboarding: makeOnboarding(onboardingOverrides),
    haReady: false,
    commandHistoryLength: 0,
    onOpenMemos: vi.fn(),
    onOpenReminders: vi.fn(),
    onGoHome: vi.fn(),
    onOpenHousehold: vi.fn(),
    onSetStatus: vi.fn(),
    onRunPreset: vi.fn()
  };
}

describe("OnboardingFlow", () => {
  // ===== Phase 1: Guided coach =====

  describe("guided coach phase (not complete)", () => {
    it("renders null when show is false", () => {
      const { container } = render(<OnboardingFlow {...makeProps({ show: false })} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders note step copy and actions", () => {
      render(<OnboardingFlow {...makeProps({ currentStep: "note" })} />);

      expect(screen.getByText("Start with one memo.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open Memos" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
    });

    it("renders reminder step copy and actions", () => {
      render(<OnboardingFlow {...makeProps({ currentStep: "reminder" })} />);

      expect(screen.getByText("Add one reminder.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open Reminders" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
    });

    it("renders Home Assistant step copy and actions", () => {
      render(<OnboardingFlow {...makeProps({ currentStep: "homeAssistant" })} />);

      expect(screen.getByText("Household controls are optional.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open Household" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    });

    it("Open Memos calls onOpenMemos", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "note" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Open Memos" }));
      expect(props.onOpenMemos).toHaveBeenCalled();
    });

    it("Open Reminders calls onOpenReminders", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "reminder" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Open Reminders" }));
      expect(props.onOpenReminders).toHaveBeenCalled();
    });

    it("Open Household calls onOpenHousehold", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "homeAssistant" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Open Household" }));
      expect(props.onOpenHousehold).toHaveBeenCalled();
    });

    it("Mark done on note step calls markNoteCreated and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "note" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Mark done" }));
      expect(props.onboarding.markNoteCreated).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Great! Note created. Next: add a reminder.");
    });

    it("Mark done on reminder step calls markReminderCreated and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "reminder" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Mark done" }));
      expect(props.onboarding.markReminderCreated).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Reminder added. Next: connect Home Assistant (optional).");
    });

    it("Skip on HA step calls skipHomeAssistant, onGoHome, and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "homeAssistant" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Skip" }));
      expect(props.onboarding.skipHomeAssistant).toHaveBeenCalled();
      expect(props.onGoHome).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith(
        "Onboarding complete - you can connect Home Assistant anytime from Household."
      );
    });

    it("Dismiss button calls defer and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeProps({ currentStep: "note" });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Dismiss onboarding" }));
      expect(props.onboarding.defer).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Onboarding deferred - you can continue anytime from settings.");
    });
  });

  // ===== Phase 2: Welcome panel =====

  describe("welcome panel phase (complete)", () => {
    function makeCompleteProps(overrides: Partial<ReturnType<typeof makeProps>> = {}) {
      return {
        ...makeProps({
          show: true,
          isComplete: true,
          currentStep: null,
          guidedState: { status: "completed" }
        }),
        ...overrides
      };
    }

    it("renders local-first copy and sample actions", () => {
      render(<OnboardingFlow {...makeCompleteProps()} />);

      expect(screen.getByText(/capture notes, manage tasks, set reminders/)).toBeInTheDocument();
      expect(screen.getByText(/Home Assistant is optional/)).toBeInTheDocument();
      expect(screen.getByText("Sample note")).toBeInTheDocument();
      expect(screen.getByText("Sample task")).toBeInTheDocument();
      expect(screen.getByText("Sample reminder")).toBeInTheDocument();
      expect(screen.getByText("Commands")).toBeInTheDocument();
    });

    it("shows Home Assistant as optional when not ready", () => {
      render(<OnboardingFlow {...makeCompleteProps({ haReady: false })} />);

      expect(screen.getByText("Optional")).toBeInTheDocument();
      expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    });

    it("shows Home Assistant as ready when linked", () => {
      render(<OnboardingFlow {...makeCompleteProps({ haReady: true })} />);

      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.queryByText("Optional")).not.toBeInTheDocument();
    });

    it("calls onRunPreset for sample task", () => {
      const onRunPreset = vi.fn();
      render(<OnboardingFlow {...makeCompleteProps({ onRunPreset })} />);

      screen.getByText("Sample task").click();
      expect(onRunPreset).toHaveBeenCalledWith("capture task plan groceries");
    });

    it("calls onRunPreset for sample note", () => {
      const onRunPreset = vi.fn();
      render(<OnboardingFlow {...makeCompleteProps({ onRunPreset })} />);

      screen.getByText("Sample note").click();
      expect(onRunPreset).toHaveBeenCalledWith("capture note check water filter");
    });

    it("calls onRunPreset for sample reminder", () => {
      const onRunPreset = vi.fn();
      render(<OnboardingFlow {...makeCompleteProps({ onRunPreset })} />);

      screen.getByText("Sample reminder").click();
      expect(onRunPreset).toHaveBeenCalledWith("capture reminder stretch in 10m");
    });

    it("enables Done button after a command is run", () => {
      render(<OnboardingFlow {...makeCompleteProps({ commandHistoryLength: 1 })} />);

      const doneButton = screen.getByRole("button", { name: "Done" });
      expect(doneButton).not.toBeDisabled();
    });

    it("disables Done button when no command has been run", () => {
      render(<OnboardingFlow {...makeCompleteProps({ commandHistoryLength: 0 })} />);

      const doneButton = screen.getByRole("button", { name: "Done" });
      expect(doneButton).toBeDisabled();
    });

    it("Done button calls complete and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeCompleteProps({ commandHistoryLength: 1 });
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(props.onboarding.complete).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Welcome aboard - intro marked complete.");
    });

    it("Skip button calls defer and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeCompleteProps();
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: "Skip" }));
      expect(props.onboarding.defer).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Understood - we will skip the guided intro.");
    });

    it("Restart button calls reset and onSetStatus", async () => {
      const user = userEvent.setup();
      const props = makeCompleteProps();
      render(<OnboardingFlow {...props} />);

      await user.click(screen.getByRole("button", { name: /Restart onboarding/i }));
      expect(props.onboarding.reset).toHaveBeenCalled();
      expect(props.onSetStatus).toHaveBeenCalledWith("Onboarding restarted - follow the steps again.");
    });
  });
});
