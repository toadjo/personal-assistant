/**
 * Onboarding progress tracking for the guided first-run flow.
 *
 * All onboarding state is persisted under a single localStorage key
 * ({@link STORAGE_ONBOARDING}) as a {@link PersistedOnboarding} object.
 * Legacy keys (`assistant-onboarded`, `assistant-onboarding-deferred`,
 * `assistant-onboarding-progress`) are migrated on first load.
 */

export type OnboardingStep = "note" | "reminder" | "homeAssistant";

export interface OnboardingProgress {
  noteCreated: boolean;
  reminderCreated: boolean;
  homeAssistantConnected: boolean;
  skippedHomeAssistant: boolean;
}

/** Overall flow status persisted alongside progress. */
export type OnboardingStatus = "inProgress" | "deferred" | "completed";

/** Single persisted state object for the entire onboarding flow. */
export interface PersistedOnboarding {
  progress: OnboardingProgress;
  status: OnboardingStatus;
}

export type OnboardingState =
  | { status: "notStarted" }
  | { status: "inProgress"; step: OnboardingStep; progress: OnboardingProgress }
  | { status: "completed" };
