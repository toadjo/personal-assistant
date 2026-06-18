import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { OnboardingCoach } from "./OnboardingCoach";

describe("OnboardingCoach", () => {
  it("renders note step copy and actions", () => {
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="note" {...handlers} />);

    expect(screen.getByText("Start with one memo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Memos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
  });

  it("renders reminder step copy and actions", () => {
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="reminder" {...handlers} />);

    expect(screen.getByText("Add one reminder.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Reminders" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument();
  });

  it("renders Home Assistant step copy and actions", () => {
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="homeAssistant" {...handlers} />);

    expect(screen.getByText("Household controls are optional.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Household" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("Open Memos calls correct shell callback", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="note" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Open Memos" }));

    expect(handlers.onOpenMemos).toHaveBeenCalled();
    expect(handlers.onOpenReminders).not.toHaveBeenCalled();
  });

  it("Open Reminders calls correct shell callback", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="reminder" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Open Reminders" }));

    expect(handlers.onOpenReminders).toHaveBeenCalled();
    expect(handlers.onOpenMemos).not.toHaveBeenCalled();
  });

  it("Mark done on note step calls correct progress callback", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="note" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Mark done" }));

    expect(handlers.onMarkNoteCreated).toHaveBeenCalled();
    expect(handlers.onMarkReminderCreated).not.toHaveBeenCalled();
  });

  it("Mark done on reminder step calls correct progress callback", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="reminder" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Mark done" }));

    expect(handlers.onMarkReminderCreated).toHaveBeenCalled();
    expect(handlers.onMarkNoteCreated).not.toHaveBeenCalled();
  });

  it("Skip calls Home Assistant skip flow", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="homeAssistant" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(handlers.onSkipHomeAssistant).toHaveBeenCalled();
  });

  it("Later defers onboarding", async () => {
    const user = userEvent.setup();
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    render(<OnboardingCoach currentStep="note" {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Dismiss onboarding" }));

    expect(handlers.onDefer).toHaveBeenCalled();
  });

  it("renders null when currentStep is null", () => {
    const handlers = {
      onOpenMemos: vi.fn(),
      onOpenReminders: vi.fn(),
      onOpenHousehold: vi.fn(),
      onMarkNoteCreated: vi.fn(),
      onMarkReminderCreated: vi.fn(),
      onSkipHomeAssistant: vi.fn(),
      onDefer: vi.fn()
    };

    const { container } = render(<OnboardingCoach currentStep={null} {...handlers} />);

    expect(container).toBeEmptyDOMElement();
  });
});
