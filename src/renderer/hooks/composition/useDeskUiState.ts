/**
 * UI state composition hook.
 *
 * Ownership:
 * - Status/error messaging and auto-clear timing
 * - Theme preference
 * - Onboarding visibility and auto-dismiss logic
 * - Desk window actions (hide)
 *
 * Dependencies:
 * - commandHistoryLength: for auto-dismissing onboarding after first command
 *
 * This hook is self-contained UI state and does not depend on other workspace state.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ThemeMode } from "../../types";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../../constants/storageKeys";
import { useWorkspaceMessages } from "../ui/useWorkspaceMessages";
import { useThemePreference } from "../ui/useThemePreference";

export type DeskUiState = {
  theme: ThemeMode;
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
  status: string;
  setStatus: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  reportError: (err: unknown) => void;
  onboarding: {
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
  };
  desk: {
    hideWindow: () => void;
  };
};

export function useDeskUiState(commandHistoryLength: number): DeskUiState {
  const { theme, setTheme } = useThemePreference();
  const { status, setStatus, error, setError, reportError } = useWorkspaceMessages();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !window.localStorage.getItem(STORAGE_ONBOARDED) && !window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)
  );

  // Auto-dismiss onboarding after first command
  useEffect(() => {
    if (!showOnboarding) return;
    if (commandHistoryLength === 0) return;
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
    setShowOnboarding(false);
    setStatus("Nice—first command received. I will stay out of your way unless you need me.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandHistoryLength, setStatus]);

  return {
    theme,
    setTheme,
    status,
    setStatus,
    error,
    setError,
    reportError,
    onboarding: {
      show: showOnboarding,
      setShow: setShowOnboarding
    },
    desk: {
      hideWindow: () => {
        void window.assistantApi.hideDeskWindow();
      }
    }
  };
}
