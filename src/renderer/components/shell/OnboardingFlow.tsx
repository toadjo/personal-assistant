/**
 * Unified onboarding flow component.
 *
 * Replaces the former ShellOnboarding + OnboardingCoach + OnboardingPanel trio.
 * Renders two phases depending on progress:
 * 1. Guided coach — walks the user through note → reminder → Home Assistant.
 * 2. Welcome panel — shown after guided steps are complete, with sample commands
 *    and Skip / Done / Restart actions.
 *
 * All state transitions (defer, complete, skip, reset) are delegated to the
 * `onboarding` slice from {@link useOnboardingProgress}, so this component
 * contains no localStorage logic.
 */

import { X, Compass, CheckCircle, RotateCcw } from "lucide-react";
import type { OnboardingStep } from "../../types/onboarding";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";

export type OnboardingFlowProps = {
  onboarding: AssistantWorkspace["onboarding"];
  haReady: boolean;
  commandHistoryLength: number;
  onOpenMemos: () => void;
  onOpenReminders: () => void;
  onGoHome: () => void;
  onOpenHousehold: () => void;
  onSetStatus: (msg: string) => void;
  onRunPreset: (preset: string) => void;
};

const stepConfig: Record<OnboardingStep, { title: string; primaryAction: string; secondaryAction: string }> = {
  note: {
    title: "Start with one memo.",
    primaryAction: "Open Memos",
    secondaryAction: "Mark done"
  },
  reminder: {
    title: "Add one reminder.",
    primaryAction: "Open Reminders",
    secondaryAction: "Mark done"
  },
  homeAssistant: {
    title: "Household controls are optional.",
    primaryAction: "Open Household",
    secondaryAction: "Skip"
  }
};

export function OnboardingFlow({
  onboarding,
  haReady,
  commandHistoryLength,
  onOpenMemos,
  onOpenReminders,
  onGoHome,
  onOpenHousehold,
  onSetStatus,
  onRunPreset
}: OnboardingFlowProps): JSX.Element | null {
  if (!onboarding.show) {
    return null;
  }

  // --- Phase 1: Guided coach ---
  if (!onboarding.isComplete) {
    const currentStep = onboarding.currentStep;
    if (!currentStep) return null;

    const step = stepConfig[currentStep];

    const handlePrimaryAction = () => {
      switch (currentStep) {
        case "note":
          onOpenMemos();
          break;
        case "reminder":
          onOpenReminders();
          break;
        case "homeAssistant":
          onOpenHousehold();
          break;
      }
    };

    const handleSecondaryAction = () => {
      switch (currentStep) {
        case "note":
          onboarding.markNoteCreated();
          onSetStatus("Great! Note created. Next: add a reminder.");
          break;
        case "reminder":
          onboarding.markReminderCreated();
          onSetStatus("Reminder added. Next: connect Home Assistant (optional).");
          break;
        case "homeAssistant":
          onGoHome();
          onboarding.skipHomeAssistant();
          onSetStatus("Onboarding complete - you can connect Home Assistant anytime from Household.");
          break;
      }
    };

    return (
      <div className="onboardingHero">
        <section className="onboardingCoach" aria-label="Onboarding guidance">
          <div className="onboardingCoachContent">
            <p className="onboardingCoachTitle">{step.title}</p>
            <div className="onboardingCoachActions">
              <button type="button" className="primaryButton" onClick={handlePrimaryAction}>
                {step.primaryAction}
              </button>
              <button type="button" className="ghostButton" onClick={handleSecondaryAction}>
                {step.secondaryAction}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="textButton onboardingCoachDismiss"
            onClick={() => {
              onboarding.defer();
              onSetStatus("Onboarding deferred - you can continue anytime from settings.");
            }}
            aria-label="Dismiss onboarding"
          >
            <X size={14} />
          </button>
        </section>
      </div>
    );
  }

  // --- Phase 2: Welcome panel ---
  return (
    <div className="onboardingHero">
      <section className="panel onboarding">
        <div className="titleRow">
          <h2>
            <Compass size={16} className="panelHeaderIcon" /> First time here
          </h2>
          <div className="miniActions">
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                onboarding.reset();
                onSetStatus("Onboarding restarted - follow the steps again.");
              }}
              aria-label="Restart onboarding"
            >
              <RotateCcw size={14} /> Restart
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                onboarding.defer();
                onSetStatus("Understood - we will skip the guided intro.");
              }}
            >
              Skip
            </button>
            <button
              type="button"
              className="ghostButton"
              disabled={commandHistoryLength === 0}
              onClick={() => {
                onboarding.complete();
                onSetStatus("Welcome aboard - intro marked complete.");
              }}
            >
              Done
            </button>
          </div>
        </div>
        <p className="muted">
          Welcome to Personal OS. This app helps you capture notes, manage tasks, set reminders, and see your day at a
          glance - all from your desktop. Everything stays on your computer. Closing the window keeps the app running:
          in the system tray on Windows and macOS, or minimized to the taskbar on Linux when no tray is available. Home
          Assistant is optional and can be added later.
        </p>
        <ul className="onboardingChecklist">
          <li className="onboardingChecklistItem">
            <span>Household (Home Assistant)</span>
            <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>
              {haReady ? <CheckCircle size={12} /> : null} {haReady ? "Ready" : "Optional"}
            </span>
          </li>
          <li className="onboardingChecklistItem">
            <span>First command</span>
            <span
              className={`onboardingState ${commandHistoryLength > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}
            >
              {commandHistoryLength > 0 ? <CheckCircle size={12} /> : null}{" "}
              {commandHistoryLength > 0 ? "Done" : "Try a line"}
            </span>
          </li>
        </ul>
        <div className="presetRow">
          <button type="button" className="ghostButton" onClick={() => onRunPreset("capture note check water filter")}>
            Sample note
          </button>
          <button type="button" className="ghostButton" onClick={() => onRunPreset("capture task plan groceries")}>
            Sample task
          </button>
          <button type="button" className="ghostButton" onClick={() => onRunPreset("capture reminder stretch in 10m")}>
            Sample reminder
          </button>
          <button type="button" className="ghostButton" onClick={() => onRunPreset("help")}>
            Commands
          </button>
        </div>
      </section>
    </div>
  );
}
