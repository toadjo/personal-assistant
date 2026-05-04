/**
 * Hook for managing onboarding progress state.
 */

import { useState, useEffect } from "react";
import type { OnboardingProgress, OnboardingState, OnboardingStep } from "../types/onboarding";
import { STORAGE_ONBOARDING_PROGRESS, STORAGE_ONBOARDED } from "../constants/storageKeys";

const DEFAULT_PROGRESS: OnboardingProgress = {
  noteCreated: false,
  reminderCreated: false,
  homeAssistantConnected: false,
  skippedHomeAssistant: false,
};

function loadProgress(): OnboardingProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
    if (stored) {
      return JSON.parse(stored) as OnboardingProgress;
    }
  } catch {
    // If parsing fails, use default
  }
  return DEFAULT_PROGRESS;
}

function saveProgress(progress: OnboardingProgress): void {
  window.localStorage.setItem(STORAGE_ONBOARDING_PROGRESS, JSON.stringify(progress));
}

function getCurrentStep(progress: OnboardingProgress): OnboardingStep | null {
  if (!progress.noteCreated) return "note";
  if (!progress.reminderCreated) return "reminder";
  if (!progress.homeAssistantConnected && !progress.skippedHomeAssistant) return "homeAssistant";
  return null; // All steps complete
}

export function useOnboardingProgress() {
  const [progress, setProgressState] = useState<OnboardingProgress>(loadProgress);

  // Sync with localStorage when it changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_ONBOARDING_PROGRESS && e.newValue) {
        try {
          setProgressState(JSON.parse(e.newValue) as OnboardingProgress);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateProgress = (updates: Partial<OnboardingProgress>): void => {
    setProgressState((currentProgress) => {
      const newProgress = { ...currentProgress, ...updates };
      saveProgress(newProgress);
      return newProgress;
    });
  };

  const markNoteCreated = (): void => {
    updateProgress({ noteCreated: true });
  };

  const markReminderCreated = (): void => {
    updateProgress({ reminderCreated: true });
  };

  const markHomeAssistantConnected = (): void => {
    updateProgress({ homeAssistantConnected: true });
  };

  const skipHomeAssistant = (): void => {
    updateProgress({ skippedHomeAssistant: true });
  };

  const reset = (): void => {
    setProgressState(DEFAULT_PROGRESS);
    saveProgress(DEFAULT_PROGRESS);
    window.localStorage.removeItem(STORAGE_ONBOARDED);
  };

  const currentStep = getCurrentStep(progress);
  const isComplete = currentStep === null;

  const state: OnboardingState = isComplete
    ? { status: "completed" }
    : currentStep
    ? { status: "inProgress", step: currentStep, progress }
    : { status: "notStarted" };

  return {
    state,
    progress,
    currentStep,
    isComplete,
    markNoteCreated,
    markReminderCreated,
    markHomeAssistantConnected,
    skipHomeAssistant,
    reset,
  };
}
