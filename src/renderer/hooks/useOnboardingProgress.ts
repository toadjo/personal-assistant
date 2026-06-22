/**
 * Hook for managing onboarding progress and flow state.
 *
 * This hook is the single owner of all onboarding state:
 * - Step progress (note/reminder/HA completion)
 * - Flow status (inProgress / deferred / completed)
 * - Runtime visibility (`show`)
 *
 * All state is persisted under one localStorage key ({@link STORAGE_ONBOARDING}).
 * Legacy keys are migrated on first load and then cleaned up.
 */

import { useState, useEffect, useCallback } from "react";
import type {
  OnboardingProgress,
  OnboardingState,
  OnboardingStep,
  OnboardingStatus,
  PersistedOnboarding
} from "../types/onboarding";
import {
  STORAGE_ONBOARDING,
  STORAGE_ONBOARDED,
  STORAGE_ONBOARDING_DEFERRED,
  STORAGE_ONBOARDING_PROGRESS
} from "../constants/storageKeys";

const DEFAULT_PROGRESS: OnboardingProgress = {
  noteCreated: false,
  reminderCreated: false,
  homeAssistantConnected: false,
  skippedHomeAssistant: false
};

// --- Migration from legacy keys ---

function migrateFromLegacy(): PersistedOnboarding {
  const rawProgress = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
  let progress: OnboardingProgress = { ...DEFAULT_PROGRESS };
  if (rawProgress) {
    try {
      const parsed = JSON.parse(rawProgress) as Partial<OnboardingProgress>;
      progress = {
        noteCreated: Boolean(parsed.noteCreated),
        reminderCreated: Boolean(parsed.reminderCreated),
        homeAssistantConnected: Boolean(parsed.homeAssistantConnected),
        skippedHomeAssistant: Boolean(parsed.skippedHomeAssistant)
      };
    } catch {
      // Ignore malformed legacy progress
    }
  }

  let status: OnboardingStatus = "inProgress";
  if (window.localStorage.getItem(STORAGE_ONBOARDED) === "1") {
    status = "completed";
  } else if (window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED) === "1") {
    status = "deferred";
  }

  return { progress, status };
}

function loadPersisted(): PersistedOnboarding {
  const raw = window.localStorage.getItem(STORAGE_ONBOARDING);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedOnboarding>;
      if (parsed && typeof parsed.status === "string" && parsed.progress && typeof parsed.progress === "object") {
        return {
          progress: {
            noteCreated: Boolean(parsed.progress.noteCreated),
            reminderCreated: Boolean(parsed.progress.reminderCreated),
            homeAssistantConnected: Boolean(parsed.progress.homeAssistantConnected),
            skippedHomeAssistant: Boolean(parsed.progress.skippedHomeAssistant)
          },
          status: parsed.status as OnboardingStatus
        };
      }
    } catch {
      // Fall through to migration
    }
  }

  // No valid new-key data — migrate from legacy keys
  const migrated = migrateFromLegacy();
  persist(migrated);
  cleanupLegacyKeys();
  return migrated;
}

function persist(state: PersistedOnboarding): void {
  window.localStorage.setItem(STORAGE_ONBOARDING, JSON.stringify(state));
}

function cleanupLegacyKeys(): void {
  window.localStorage.removeItem(STORAGE_ONBOARDED);
  window.localStorage.removeItem(STORAGE_ONBOARDING_DEFERRED);
  window.localStorage.removeItem(STORAGE_ONBOARDING_PROGRESS);
}

// --- Derived helpers ---

function getCurrentStep(progress: OnboardingProgress): OnboardingStep | null {
  if (!progress.noteCreated) return "note";
  if (!progress.reminderCreated) return "reminder";
  if (!progress.homeAssistantConnected && !progress.skippedHomeAssistant) return "homeAssistant";
  return null;
}

function deriveState(persisted: PersistedOnboarding): OnboardingState {
  const step = getCurrentStep(persisted.progress);
  if (persisted.status === "completed" || step === null) {
    return { status: "completed" };
  }
  if (persisted.status === "inProgress") {
    return { status: "inProgress", step, progress: persisted.progress };
  }
  // deferred — treat as notStarted for display purposes
  return { status: "notStarted" };
}

export function useOnboardingProgress() {
  const [persisted, setPersisted] = useState<PersistedOnboarding>(loadPersisted);
  const [show, setShow] = useState(() => persisted.status === "inProgress");

  // Sync with localStorage when it changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_ONBOARDING && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PersistedOnboarding;
          setPersisted(parsed);
          setShow(parsed.status === "inProgress");
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updatePersisted = useCallback((next: PersistedOnboarding) => {
    setPersisted(next);
    persist(next);
  }, []);

  const updateProgress = useCallback((updates: Partial<OnboardingProgress>): void => {
    setPersisted((current) => {
      const newProgress = { ...current.progress, ...updates };
      const step = getCurrentStep(newProgress);
      // If all steps are done, auto-complete the flow
      const newStatus: OnboardingStatus = step === null ? "completed" : current.status;
      const next = { progress: newProgress, status: newStatus };
      persist(next);
      if (newStatus === "completed") {
        setShow(false);
      }
      return next;
    });
  }, []);

  const markNoteCreated = useCallback(() => updateProgress({ noteCreated: true }), [updateProgress]);

  const markReminderCreated = useCallback(() => updateProgress({ reminderCreated: true }), [updateProgress]);

  const markHomeAssistantConnected = useCallback(
    () => updateProgress({ homeAssistantConnected: true }),
    [updateProgress]
  );

  const skipHomeAssistant = useCallback(() => {
    setPersisted((current) => {
      const newProgress = { ...current.progress, skippedHomeAssistant: true };
      const next = { progress: newProgress, status: "completed" as OnboardingStatus };
      persist(next);
      return next;
    });
    setShow(false);
  }, []);

  const defer = useCallback(() => {
    updatePersisted({ ...persisted, status: "deferred" });
    setShow(false);
  }, [persisted, updatePersisted]);

  const complete = useCallback(() => {
    updatePersisted({ ...persisted, status: "completed" });
    setShow(false);
  }, [persisted, updatePersisted]);

  const reset = useCallback(() => {
    const next: PersistedOnboarding = { progress: { ...DEFAULT_PROGRESS }, status: "inProgress" };
    updatePersisted(next);
    setShow(true);
  }, [updatePersisted]);

  const currentStep = getCurrentStep(persisted.progress);
  const isComplete = currentStep === null || persisted.status === "completed";
  const state = deriveState(persisted);

  return {
    state,
    progress: persisted.progress,
    currentStep,
    isComplete,
    show,
    markNoteCreated,
    markReminderCreated,
    markHomeAssistantConnected,
    skipHomeAssistant,
    defer,
    complete,
    reset
  };
}
