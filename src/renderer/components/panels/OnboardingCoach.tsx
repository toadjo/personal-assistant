/**
 * Compact onboarding coach component.
 * Appears below the Calm Focus dashboard to guide new users through initial setup.
 */

import { X } from "lucide-react";
import type { OnboardingStep } from "../../types/onboarding";

type Props = {
  currentStep: OnboardingStep | null;
  onOpenMemos: () => void;
  onOpenReminders: () => void;
  onOpenHousehold: () => void;
  onMarkNoteCreated: () => void;
  onMarkReminderCreated: () => void;
  onSkipHomeAssistant: () => void;
  onDefer: () => void;
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

export function OnboardingCoach({
  currentStep,
  onOpenMemos,
  onOpenReminders,
  onOpenHousehold,
  onMarkNoteCreated,
  onMarkReminderCreated,
  onSkipHomeAssistant,
  onDefer
}: Props): JSX.Element | null {
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
        onMarkNoteCreated();
        break;
      case "reminder":
        onMarkReminderCreated();
        break;
      case "homeAssistant":
        onSkipHomeAssistant();
        break;
    }
  };

  return (
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
        onClick={onDefer}
        aria-label="Dismiss onboarding"
      >
        <X size={14} />
      </button>
    </section>
  );
}
