/**
 * Onboarding progress tracking for the guided first-run flow.
 */

export type OnboardingStep = "note" | "reminder" | "homeAssistant";

export interface OnboardingProgress {
  noteCreated: boolean;
  reminderCreated: boolean;
  homeAssistantConnected: boolean;
  skippedHomeAssistant: boolean;
}

export type OnboardingState =
  | { status: "notStarted" }
  | { status: "inProgress"; step: OnboardingStep; progress: OnboardingProgress }
  | { status: "completed" };
