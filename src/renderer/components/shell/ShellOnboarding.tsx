import { OnboardingPanel } from "../panels/OnboardingPanel";
import { OnboardingCoach } from "../panels/OnboardingCoach";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../../constants/storageKeys";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";

export type ShellOnboardingProps = {
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

export function ShellOnboarding({
  onboarding,
  haReady,
  commandHistoryLength,
  onOpenMemos,
  onOpenReminders,
  onGoHome,
  onOpenHousehold,
  onSetStatus,
  onRunPreset
}: ShellOnboardingProps): JSX.Element | null {
  if (!onboarding.show) {
    return null;
  }

  if (!onboarding.isComplete) {
    return (
      <div className="onboardingHero">
        <OnboardingCoach
          currentStep={onboarding.currentStep}
          onOpenMemos={onOpenMemos}
          onOpenReminders={onOpenReminders}
          onOpenHousehold={onOpenHousehold}
          onMarkNoteCreated={() => {
            onboarding.markNoteCreated();
            onSetStatus("Great! Note created. Next: add a reminder.");
          }}
          onMarkReminderCreated={() => {
            onboarding.markReminderCreated();
            onSetStatus("Reminder added. Next: connect Home Assistant (optional).");
          }}
          onSkipHomeAssistant={() => {
            onGoHome();
            onboarding.skipHomeAssistant();
            window.localStorage.setItem(STORAGE_ONBOARDED, "1");
            window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
            onboarding.setShow(false);
            onSetStatus("Onboarding complete - you can connect Home Assistant anytime from Household.");
          }}
          onDefer={() => {
            window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
            onboarding.setShow(false);
            onSetStatus("Onboarding deferred - you can continue anytime from settings.");
          }}
        />
      </div>
    );
  }

  return (
    <div className="onboardingHero">
      <OnboardingPanel
        visible={onboarding.show}
        haReady={haReady}
        commandHistoryLength={commandHistoryLength}
        onHideForNow={() => {
          window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
          onboarding.setShow(false);
          onSetStatus("Understood - we will skip the guided intro.");
        }}
        onFinishSetup={() => {
          onboarding.setShow(false);
          window.localStorage.setItem(STORAGE_ONBOARDED, "1");
          window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
          onSetStatus("Welcome aboard - intro marked complete.");
        }}
        onRunPreset={onRunPreset}
      />
    </div>
  );
}
