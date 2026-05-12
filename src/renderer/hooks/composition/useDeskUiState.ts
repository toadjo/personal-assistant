/**
 * UI state composition hook.
 *
 * Ownership:
 * - Status/error messaging and auto-clear timing
 * - Theme preference
 * - Onboarding visibility (v1.2.7: guided first-run flow)
 * - Desk window actions (hide)
 *
 * Dependencies:
 * - None - this hook is self-contained UI state
 *
 * Onboarding dismissal after first command is handled by useAssistantWorkspace
 * to avoid circular dependencies with command state.
 */
import { useState, type Dispatch, type SetStateAction } from "react";
import type { ThemeMode, ThemeTokenKey, CustomTheme } from "../../lib/theme/tokens";
import type { OnboardingState, OnboardingStep } from "../../types/onboarding";
import type { SuccessMessage } from "../ui/usePersistentSuccess";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../../constants/storageKeys";
import { useWorkspaceMessages } from "../ui/useWorkspaceMessages";
import { useThemePreference } from "../ui/useThemePreference";
import { useDisplayPreferences } from "../ui/useDisplayPreferences";
import { useOnboardingProgress } from "../useOnboardingProgress";
import type { DisplayPreferences, Density, PanelRadius } from "../../lib/display/types";

export type DeskUiState = {
  theme: ThemeMode;
  custom: CustomTheme | undefined;
  setTheme: (preset: ThemeMode) => void;
  setCustomOverride: (key: ThemeTokenKey, value: string | undefined) => void;
  resetCustomOverrides: (preset?: ThemeMode) => void;
  status: string;
  setStatus: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  reportError: (err: unknown) => void;
  // v1.2.7 persistent success feedback
  successes: SuccessMessage[];
  showSuccess: (message: string) => void;
  dismissSuccess: (id: string) => void;
  dismissAllSuccesses: () => void;
  onboarding: {
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    // v1.2.7 guided onboarding
    guidedState: OnboardingState;
    currentStep: OnboardingStep | null;
    isComplete: boolean;
    markNoteCreated: () => void;
    markReminderCreated: () => void;
    markHomeAssistantConnected: () => void;
    skipHomeAssistant: () => void;
  };
  display: DisplayPreferences & {
    setDensity: (density: Density) => void;
    setPanelRadius: (radius: PanelRadius) => void;
    setShadows: (value: boolean) => void;
    setGlassBlur: (value: boolean) => void;
    setDccShowAllSecondary: (value: boolean) => void;
    resetDisplay: () => void;
  };
  desk: {
    hideWindow: () => void;
  };
};

export function useDeskUiState(): DeskUiState {
  const { theme, custom, setTheme, setCustomOverride, resetCustomOverrides } = useThemePreference();
  const display = useDisplayPreferences();
  const { status, setStatus, error, setError, reportError, persistentSuccess } = useWorkspaceMessages();

  // v1.2.7 guided onboarding
  const onboardingProgress = useOnboardingProgress();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !window.localStorage.getItem(STORAGE_ONBOARDED) && !window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)
  );

  return {
    theme,
    custom,
    setTheme,
    setCustomOverride,
    resetCustomOverrides,
    status,
    setStatus,
    error,
    setError,
    reportError,
    // v1.2.7 persistent success feedback
    successes: persistentSuccess.successes,
    showSuccess: persistentSuccess.showSuccess,
    dismissSuccess: persistentSuccess.dismissSuccess,
    dismissAllSuccesses: persistentSuccess.dismissAll,
    onboarding: {
      show: showOnboarding,
      setShow: setShowOnboarding,
      // v1.2.7 guided onboarding
      guidedState: onboardingProgress.state,
      currentStep: onboardingProgress.currentStep,
      isComplete: onboardingProgress.isComplete,
      markNoteCreated: onboardingProgress.markNoteCreated,
      markReminderCreated: onboardingProgress.markReminderCreated,
      markHomeAssistantConnected: onboardingProgress.markHomeAssistantConnected,
      skipHomeAssistant: onboardingProgress.skipHomeAssistant
    },
    display: {
      ...display.prefs,
      setDensity: display.setDensity,
      setPanelRadius: display.setPanelRadius,
      setShadows: display.setShadows,
      setGlassBlur: display.setGlassBlur,
      setDccShowAllSecondary: display.setDccShowAllSecondary,
      resetDisplay: display.reset
    },
    desk: {
      hideWindow: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).assistantApi.hideDeskWindow();
      }
    }
  };
}
