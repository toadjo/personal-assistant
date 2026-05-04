/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from "@testing-library/react";
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
    const { result } = renderHook(() => useDeskUiState(0));

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
    const { result } = renderHook(() => useDeskUiState(0));

    expect(result.current.onboarding.show).toBe(true);
  });

  it("hides onboarding when onboarding flag is set", () => {
    window.localStorage.setItem(STORAGE_ONBOARDED, "1");
    const { result } = renderHook(() => useDeskUiState(0));

    expect(result.current.onboarding.show).toBe(false);
  });

  it("hides onboarding when deferred flag is set", () => {
    window.localStorage.setItem(STORAGE_ONBOARDING_DEFERRED, "1");
    const { result } = renderHook(() => useDeskUiState(0));

    expect(result.current.onboarding.show).toBe(false);
  });

  it("auto-dismisses onboarding after first command history entry", async () => {
    window.localStorage.clear();
    // Start with commandHistoryLength > 0 to simulate first command already received
    const { result } = renderHook(() => useDeskUiState(1));

    // Wait for useEffect to run and set localStorage
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_ONBOARDED)).toBe("1");
      expect(window.localStorage.getItem(STORAGE_ONBOARDING_DEFERRED)).toBeNull();
    });

    // Onboarding should be hidden after effect runs
    expect(result.current.onboarding.show).toBe(false);
  });

  it("desk hideWindow calls assistantApi.hideDeskWindow", () => {
    const mockHideDeskWindow = vi.fn();
    (window as any).assistantApi = {
      hideDeskWindow: mockHideDeskWindow
    };

    const { result } = renderHook(() => useDeskUiState(0));
    result.current.desk.hideWindow();

    expect(mockHideDeskWindow).toHaveBeenCalledOnce();
  });
});
