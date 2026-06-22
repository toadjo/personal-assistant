/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useDeskUiState } from "./useDeskUiState";
import { STORAGE_ONBOARDING } from "../../constants/storageKeys";

describe("useDeskUiState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns stable public shape with theme, status, error, onboarding, and desk actions", () => {
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current).toHaveProperty("theme");
    expect(result.current).toHaveProperty("setTheme");
    expect(result.current).toHaveProperty("status");
    expect(result.current).toHaveProperty("setStatus");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("setError");
    expect(result.current).toHaveProperty("reportError");
    expect(result.current).toHaveProperty("onboarding");
    expect(result.current).toHaveProperty("desk");
  });

  it("shows onboarding when storage has no onboarding state", () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(true);
  });

  it("hides onboarding when onboarding status is completed", () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING,
      JSON.stringify({
        progress: {
          noteCreated: true,
          reminderCreated: true,
          homeAssistantConnected: true,
          skippedHomeAssistant: false
        },
        status: "completed"
      })
    );
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);
  });

  it("hides onboarding when onboarding status is deferred", () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING,
      JSON.stringify({
        progress: {
          noteCreated: false,
          reminderCreated: false,
          homeAssistantConnected: false,
          skippedHomeAssistant: false
        },
        status: "deferred"
      })
    );
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);
  });

  it("does not auto-dismiss onboarding - that is handled by useAssistantWorkspace", () => {
    window.localStorage.clear();
    // Render hook without commandHistoryLength parameter
    const { result } = renderHook(() => useDeskUiState());

    // Onboarding should remain visible since dismissal is handled at workspace level
    expect(result.current.onboarding.show).toBe(true);
  });

  it("onboarding reset clears completed state and re-shows the flow", () => {
    window.localStorage.setItem(
      STORAGE_ONBOARDING,
      JSON.stringify({
        progress: {
          noteCreated: true,
          reminderCreated: true,
          homeAssistantConnected: true,
          skippedHomeAssistant: false
        },
        status: "completed"
      })
    );
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);

    act(() => {
      result.current.onboarding.reset();
    });

    expect(result.current.onboarding.show).toBe(true);
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_ONBOARDING)!);
    expect(saved.status).toBe("inProgress");
    expect(saved.progress.noteCreated).toBe(false);
  });

  it("desk hideWindow calls assistantApi.hideDeskWindow", () => {
    const mockHideDeskWindow = vi.fn();
    (window as any).assistantApi = {
      hideDeskWindow: mockHideDeskWindow
    };

    const { result } = renderHook(() => useDeskUiState());
    result.current.desk.hideWindow();

    expect(mockHideDeskWindow).toHaveBeenCalledOnce();
  });
});
