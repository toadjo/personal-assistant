/**
 * Guided first-run flow component (v1.2.7).
 * Walks users through creating their first note, reminder, and optionally connecting Home Assistant.
 */

import { Lightbulb } from "lucide-react";
import type { OnboardingStep } from "../../types/onboarding";

type Props = {
  currentStep: OnboardingStep | null;
  onComplete: () => void;
  onCreateNote: () => void;
  onCreateReminder: () => void;
  onOpenHousehold: () => void;
  onSkipHomeAssistant: () => void;
};

export function GuidedOnboardingPanel({
  currentStep,
  onComplete: _onComplete,
  onCreateNote,
  onCreateReminder,
  onOpenHousehold,
  onSkipHomeAssistant
}: Props): JSX.Element | null {
  if (!currentStep) return null;

  const steps: Record<OnboardingStep, { title: string; description: string; action: string; instruction: string }> = {
    note: {
      title: "Create your first note",
      description:
        "Notes are for quick memos, ideas, or anything you want to remember. Everything stays on your computer.",
      action: "I've created a note",
      instruction: "Use the Notes panel on the right to create your first note, then click the button below."
    },
    reminder: {
      title: "Create your first reminder",
      description: "Reminders show desktop notifications when they're due. Set a time and we'll alert you.",
      action: "I've created a reminder",
      instruction: "Use the Reminders panel on the right to create your first reminder, then click the button below."
    },
    homeAssistant: {
      title: "Connect Home Assistant (optional)",
      description:
        "Connect to control your smart home devices. This step is optional - skipping it does not reduce the app's core usefulness.",
      action: "Connect Home Assistant",
      instruction: "Open the Household window to connect your Home Assistant instance, or skip for now."
    }
  };

  const step = steps[currentStep];
  const stepNumber = currentStep === "note" ? 1 : currentStep === "reminder" ? 2 : 3;
  const totalSteps = 3;

  return (
    <section className="panel guided-onboarding">
      <div className="titleRow">
        <h2>
          <Lightbulb size={16} className="panelHeaderIcon" /> Get started
        </h2>
        <div className="stepIndicator">
          Step {stepNumber} of {totalSteps}
        </div>
      </div>
      <p className="stepDescription">{step.description}</p>
      <p className="stepInstruction">{step.instruction}</p>
      <div className="stepActions">
        {currentStep === "homeAssistant" ? (
          <>
            <button type="button" className="primaryButton" onClick={onOpenHousehold}>
              {step.action}
            </button>
            <button type="button" className="ghostButton" onClick={onSkipHomeAssistant}>
              Skip for now
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primaryButton"
            onClick={currentStep === "note" ? onCreateNote : onCreateReminder}
          >
            {step.action}
          </button>
        )}
      </div>
    </section>
  );
}
