/**
 * UI state composition hook.
 *
 * Ownership:
 * - Status/error messaging and auto-clear timing
 * - Theme preference
 * - Onboarding visibility (guided first-run flow)
 * - Desk window actions (hide)
 *
 * Dependencies:
 * - None - this hook is self-contained UI state
 *
 * Onboarding dismissal after first command is handled by useAssistantWorkspace
 * to avoid circular dependencies with command state.
 */
import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import type { ThemeMode, ThemeTokenKey, CustomTheme } from "../../lib/theme/tokens";
import type { OnboardingState, OnboardingStep } from "../../types/onboarding";
import type { SuccessMessage } from "../ui/usePersistentSuccess";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../../constants/storageKeys";
import { useWorkspaceMessages } from "../ui/useWorkspaceMessages";
import { useThemePreference } from "../ui/useThemePreference";
import { useDisplayPreferences } from "../ui/useDisplayPreferences";
import { useOnboardingProgress } from "../useOnboardingProgress";
import type { DisplayPreferences, Density, PanelRadius } from "../../lib/display/types";
import { getAssistantApi } from "../../lib/assistantApi";

export type DeskMode = "personal" | "projects";

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
  // persistent success feedback
  successes: SuccessMessage[];
  showSuccess: (message: string) => void;
  dismissSuccess: (id: string) => void;
  dismissAllSuccesses: () => void;
  onboarding: {
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    // guided onboarding
    guidedState: OnboardingState;
    currentStep: OnboardingStep | null;
    isComplete: boolean;
    markNoteCreated: () => void;
    markReminderCreated: () => void;
    markHomeAssistantConnected: () => void;
    skipHomeAssistant: () => void;
    reset: () => void;
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
    mode: DeskMode;
    setMode: (mode: DeskMode) => void;
  };
};

export function useDeskUiState(): DeskUiState {
  const { theme, custom, setTheme, setCustomOverride, resetCustomOverrides } = useThemePreference();
  const display = useDisplayPreferences();
  const { status, setStatus, error, setError, reportError, persistentSuccess } = useWorkspaceMessages();

  const onboardingProgress = useOnboardingProgress();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !window.localStorage.getItem(STORAGE_ONBOARDED) && !window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)
  );

  const resetOnboarding = useCallback(() => {
    onboardingProgress.reset();
    window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
    setShowOnboarding(true);
  }, [onboardingProgress]);

  const [deskMode, setDeskMode] = useState<DeskMode>("personal");

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
    // persistent success feedback
    successes: persistentSuccess.successes,
    showSuccess: persistentSuccess.showSuccess,
    dismissSuccess: persistentSuccess.dismissSuccess,
    dismissAllSuccesses: persistentSuccess.dismissAll,
    onboarding: {
      show: showOnboarding,
      setShow: setShowOnboarding,
      // guided onboarding
      guidedState: onboardingProgress.state,
      currentStep: onboardingProgress.currentStep,
      isComplete: onboardingProgress.isComplete,
      markNoteCreated: onboardingProgress.markNoteCreated,
      markReminderCreated: onboardingProgress.markReminderCreated,
      markHomeAssistantConnected: onboardingProgress.markHomeAssistantConnected,
      skipHomeAssistant: onboardingProgress.skipHomeAssistant,
      reset: resetOnboarding
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
        const api = getAssistantApi();
        if (api?.hideDeskWindow) {
          api.hideDeskWindow();
        }
      },
      mode: deskMode,
      setMode: setDeskMode
    }
  };
}
