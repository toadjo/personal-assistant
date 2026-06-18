/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useDeskUiState } from "./useDeskUiState";
import { STORAGE_ONBOARDED, STORAGE_ONBOARDING_DEFERRED } from "../../constants/storageKeys";

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

  it("shows onboarding when storage has no onboarding flags", () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(true);
  });

  it("hides onboarding when onboarding flag is set", () => {
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);
  });

  it("hides onboarding when deferred flag is set", () => {
    window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);
  });

  it("does not auto-dismiss onboarding - that is handled by useAssistantWorkspace", () => {
    window.localStorage.clear();
    // Render hook without commandHistoryLength parameter
    const { result } = renderHook(() => useDeskUiState());

    // Onboarding should remain visible since dismissal is handled at workspace level
    expect(result.current.onboarding.show).toBe(true);
    expect(window.localStorage.getItem(STORAGE_ONBOARDED)).toBeNull();
  });

  it("onboarding reset clears completed flags and re-shows the flow", () => {
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
    const { result } = renderHook(() => useDeskUiState());

    expect(result.current.onboarding.show).toBe(false);

    act(() => {
      result.current.onboarding.reset();
    });

    expect(result.current.onboarding.show).toBe(true);
    expect(window.localStorage.getItem(STORAGE_ONBOARDED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)).toBeNull();
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
