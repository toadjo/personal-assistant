import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShellModals } from "./useShellModals";

describe("useShellModals", () => {
  it("each open* sets true", () => {
    const { result } = renderHook(() => useShellModals());

    expect(result.current.showAbout).toBe(false);
    act(() => {
      result.current.openAbout();
    });
    expect(result.current.showAbout).toBe(true);

    expect(result.current.showReleaseNotes).toBe(false);
    act(() => {
      result.current.openReleaseNotes();
    });
    expect(result.current.showReleaseNotes).toBe(true);

    expect(result.current.showEndOfDayReview).toBe(false);
    act(() => {
      result.current.openEndOfDayReview();
    });
    expect(result.current.showEndOfDayReview).toBe(true);
  });

  it("each close* sets false", () => {
    const { result } = renderHook(() => useShellModals());

    act(() => {
      result.current.openAbout();
    });
    expect(result.current.showAbout).toBe(true);
    act(() => {
      result.current.closeAbout();
    });
    expect(result.current.showAbout).toBe(false);

    act(() => {
      result.current.toggleAppearance();
    });
    expect(result.current.showAppearance).toBe(true);
    act(() => {
      result.current.closeAppearance();
    });
    expect(result.current.showAppearance).toBe(false);

    act(() => {
      result.current.toggleAi();
    });
    expect(result.current.showAi).toBe(true);
    act(() => {
      result.current.closeAi();
    });
    expect(result.current.showAi).toBe(false);

    act(() => {
      result.current.toggleConnectedAccounts();
    });
    expect(result.current.showConnectedAccounts).toBe(true);
    act(() => {
      result.current.closeConnectedAccounts();
    });
    expect(result.current.showConnectedAccounts).toBe(false);

    act(() => {
      result.current.togglePalette();
    });
    expect(result.current.showPalette).toBe(true);
    act(() => {
      result.current.closePalette();
    });
    expect(result.current.showPalette).toBe(false);

    act(() => {
      result.current.openReleaseNotes();
    });
    expect(result.current.showReleaseNotes).toBe(true);
    act(() => {
      result.current.closeReleaseNotes();
    });
    expect(result.current.showReleaseNotes).toBe(false);
  });

  it("each toggle* flips", () => {
    const { result } = renderHook(() => useShellModals());

    expect(result.current.showAppearance).toBe(false);
    act(() => {
      result.current.toggleAppearance();
    });
    expect(result.current.showAppearance).toBe(true);
    act(() => {
      result.current.toggleAppearance();
    });
    expect(result.current.showAppearance).toBe(false);

    expect(result.current.showData).toBe(false);
    act(() => {
      result.current.toggleData();
    });
    expect(result.current.showData).toBe(true);
    act(() => {
      result.current.toggleData();
    });
    expect(result.current.showData).toBe(false);

    expect(result.current.showAi).toBe(false);
    act(() => {
      result.current.toggleAi();
    });
    expect(result.current.showAi).toBe(true);
    act(() => {
      result.current.toggleAi();
    });
    expect(result.current.showAi).toBe(false);

    expect(result.current.showConnectedAccounts).toBe(false);
    act(() => {
      result.current.toggleConnectedAccounts();
    });
    expect(result.current.showConnectedAccounts).toBe(true);
    act(() => {
      result.current.toggleConnectedAccounts();
    });
    expect(result.current.showConnectedAccounts).toBe(false);

    expect(result.current.showPalette).toBe(false);
    act(() => {
      result.current.togglePalette();
    });
    expect(result.current.showPalette).toBe(true);
    act(() => {
      result.current.togglePalette();
    });
    expect(result.current.showPalette).toBe(false);
  });
});
