import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useOnboardingProgress } from "./useOnboardingProgress";
import { STORAGE_ONBOARDING_PROGRESS } from "../constants/storageKeys";

describe("useOnboardingProgress (v1.2.7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns stable public shape with state, progress, and actions", () => {
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current).toHaveProperty("state");
    expect(result.current).toHaveProperty("progress");
    expect(result.current).toHaveProperty("currentStep");
    expect(result.current).toHaveProperty("isComplete");
    expect(result.current).toHaveProperty("markNoteCreated");
    expect(result.current).toHaveProperty("markReminderCreated");
    expect(result.current).toHaveProperty("markHomeAssistantConnected");
    expect(result.current).toHaveProperty("skipHomeAssistant");
  });

  it("starts with note step when no progress is saved", () => {
    const { result } = renderHook(() => useOnboardingProgress());

    expect(result.current.state.status).toBe("inProgress");
    expect(result.current.currentStep).toBe("note");
    expect(result.current.isComplete).toBe(false);
  });

  it("loads saved progress from localStorage", () => {
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

    expect(result.current.state.status).toBe("inProgress");
    expect(result.current.currentStep).toBe("reminder");
    expect(result.current.isComplete).toBe(false);
  });

  it("marks as complete when all steps are done", () => {
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

    expect(result.current.state.status).toBe("completed");
    expect(result.current.isComplete).toBe(true);
  });

  it("completes note step and saves to localStorage", async () => {
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.markNoteCreated();
    });

    await waitFor(() => {
      const saved = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
      expect(saved).toBeTruthy();
      const progress = JSON.parse(saved!);
      expect(progress.noteCreated).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.currentStep).toBe("reminder");
    });
  });

  it("completes reminder step and moves to homeAssistant", async () => {
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

    act(() => {
      result.current.markReminderCreated();
    });

    await waitFor(() => {
      const saved = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
      const progress = JSON.parse(saved!);
      expect(progress.noteCreated).toBe(true);
      expect(progress.reminderCreated).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.currentStep).toBe("homeAssistant");
    });
  });

  it("completes homeAssistant step and marks flow as complete", async () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING_PROGRESS,
      JSON.stringify({
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      })
    );
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.markHomeAssistantConnected();
    });

    await waitFor(() => {
      const saved = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
      const progress = JSON.parse(saved!);
      expect(progress.noteCreated).toBe(true);
      expect(progress.reminderCreated).toBe(true);
      expect(progress.homeAssistantConnected).toBe(true);
      expect(result.current.state.status).toBe("completed");
      expect(result.current.isComplete).toBe(true);
    });
  });

  it("skipHomeAssistant skips HA step and marks flow as complete", async () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING_PROGRESS,
      JSON.stringify({
        noteCreated: true,
        reminderCreated: true,
        homeAssistantConnected: false,
        skippedHomeAssistant: false
      })
    );
    const { result } = renderHook(() => useOnboardingProgress());

    act(() => {
      result.current.skipHomeAssistant();
    });

    await waitFor(() => {
      const saved = window.localStorage.getItem(STORAGE_ONBOARDING_PROGRESS);
      const progress = JSON.parse(saved!);
      expect(progress.noteCreated).toBe(true);
      expect(progress.reminderCreated).toBe(true);
      expect(progress.skippedHomeAssistant).toBe(true);
      expect(result.current.state.status).toBe("completed");
      expect(result.current.isComplete).toBe(true);
    });
  });
});
