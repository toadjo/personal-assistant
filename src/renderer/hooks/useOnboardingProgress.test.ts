import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useOnboardingProgress } from "./useOnboardingProgress";
import {
  STORAGE_ONBOARDING,
  STORAGE_ONBOARDED,
  STORAGE_ONBOARDING_DEFERRED,
  STORAGE_ONBOARDING_PROGRESS
} from "../constants/storageKeys";
import type { PersistedOnboarding } from "../types/onboarding";

function setOnboardingState(state: PersistedOnboarding): void {
  window.localStorage.setItem(STORAGE_ONBOARDING, JSON.stringify(state));
}

function getOnboardingState(): PersistedOnboarding | null {
  const raw = window.localStorage.getItem(STORAGE_ONBOARDING);
  return raw ? (JSON.parse(raw) as PersistedOnboarding) : null;
}

describe("useOnboardingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns stable public shape with state, progress, show, and actions", () => {
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current).toHaveProperty("state");
    expect(result.current).toHaveProperty("progress");
    expect(result.current).toHaveProperty("currentStep");
    expect(result.current).toHaveProperty("isComplete");
    expect(result.current).toHaveProperty("show");
    expect(result.current).toHaveProperty("markNoteCreated");
    expect(result.current).toHaveProperty("markReminderCreated");
    expect(result.current).toHaveProperty("markHomeAssistantConnected");
    expect(result.current).toHaveProperty("skipHomeAssistant");
    expect(result.current).toHaveProperty("defer");
    expect(result.current).toHaveProperty("complete");
    expect(result.current).toHaveProperty("reset");
  });

  it("starts with note step and show=true when no state is saved", () => {
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.state.status).toBe("inProgress");
    expect(result.current.currentStep).toBe("note");
    expect(result.current.isComplete).toBe(false);
    expect(result.current.show).toBe(true);
  });

  it("loads saved progress from the single onboarding key", () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      },
      status: "inProgress"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.state.status).toBe("inProgress");
    expect(result.current.currentStep).toBe("reminder");
    expect(result.current.isComplete).toBe(false);
    expect(result.current.show).toBe(true);
  });

  it("does not show when status is completed", () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: true,
        skippedHomeAssistant: false
      },
      status: "completed"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.state.status).toBe("completed");
    expect(result.current.isComplete).toBe(true);
    expect(result.current.show).toBe(false);
  });

  it("does not show when status is deferred", () => {
    setOnboardingState({
      progress: {
        noteCreated: false,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      },
      status: "deferred"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.show).toBe(false);
  });

  // --- Migration from legacy keys ---

  it("migrates from legacy keys when new key is absent (onboarded)", () => {
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    window.localStorage.setItem(
      STORAGE_ONBOARDING_PROGRESS,
      JSON.stringify({
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: true,
        skippedHomeAssistant: false
      })
    );

    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.show).toBe(false);

    // New key should be written
    const migrated = getOnboardingState();
    expect(migrated).not.toBeNull();
    expect(migrated!.status).toBe("completed");
    expect(migrated!.progress.noteCreated).toBe(true);

    // Legacy keys should be cleaned up
    expect(window.localStorage.getItem(STORAGE_ONBOARDED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS)).toBeNull();
  });

  it("migrates from legacy keys when new key is absent (deferred)", () => {
    window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
    window.localStorage.setItem(
      STORAGE_ONBOARDING_PROGRESS,
      JSON.stringify({
        noteCreated: true,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      })
    );

    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.show).toBe(false);
    expect(result.current.progress.noteCreated).toBe(true);

    const migrated = getOnboardingState();
    expect(migrated!.status).toBe("deferred");
  });

  it("migrates from legacy keys when new key is absent (inProgress)", () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING_PROGRESS,
      JSON.stringify({
        noteCreated: false,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      })
    );

    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.show).toBe(true);
    expect(result.current.currentStep).toBe("note");

    const migrated = getOnboardingState();
    expect(migrated!.status).toBe("inProgress");
  });

  // --- Step progression ---

  it("completes note step and saves to localStorage", async () => {
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.markNoteCreated();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved).not.toBeNull();
      expect(saved!.progress.noteCreated).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.currentStep).toBe("reminder");
    });
  });

  it("completes reminder step and moves to homeAssistant", async () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: false,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      },
      status: "inProgress"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.markReminderCreated();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved!.progress.noteCreated).toBe(true);
      expect(saved!.progress.reminderCreated).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.currentStep).toBe("homeAssistant");
    });
  });

  it("completes homeAssistant step and auto-completes the flow", async () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      },
      status: "inProgress"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.markHomeAssistantConnected();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved!.progress.homeAssistantConnected).toBe(true);
      expect(saved!.status).toBe("completed");
      expect(result.current.state.status).toBe("completed");
      expect(result.current.isComplete).toBe(true);
      expect(result.current.show).toBe(false);
    });
  });

  it("skipHomeAssistant skips HA step, completes flow, and hides", async () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      },
      status: "inProgress"
    });
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.skipHomeAssistant();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved!.progress.skippedHomeAssistant).toBe(true);
      expect(saved!.status).toBe("completed");
      expect(result.current.state.status).toBe("completed");
      expect(result.current.isComplete).toBe(true);
      expect(result.current.show).toBe(false);
    });
  });

  // --- Flow control ---

  it("defer sets status to deferred and hides", async () => {
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.defer();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved!.status).toBe("deferred");
      expect(result.current.show).toBe(false);
    });
  });

  it("complete sets status to completed and hides", async () => {
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.complete();
    });

    await waitFor(() => {
      const saved = getOnboardingState();
      expect(saved!.status).toBe("completed");
      expect(result.current.show).toBe(false);
    });
  });

  it("reset restarts the persisted onboarding flow from the first step", async () => {
    setOnboardingState({
      progress: {
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: true,
        skippedHomeAssistant: false
      },
      status: "completed"
    });
    const { result } = renderHook(() => useOnboardingProgress());
    expect(result.current.isComplete).toBe(true);

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("inProgress");
      expect(result.current.currentStep).toBe("note");
      expect(result.current.isComplete).toBe(false);
      expect(result.current.show).toBe(true);
      const saved = getOnboardingState();
      expect(saved!.progress.noteCreated).toBe(false);
      expect(saved!.progress.reminderCreated).toBe(false);
      expect(saved!.progress.homeAssistantConnected).toBe(false);
      expect(saved!.progress.skippedHomeAssistant).toBe(false);
      expect(saved!.status).toBe("inProgress");
    });
  });
});
