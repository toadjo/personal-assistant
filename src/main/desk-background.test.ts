import type { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createTrayMock = vi.fn();
const warnMock = vi.fn();

vi.mock("./tray", () => ({
  createTray: (...args: unknown[]) => createTrayMock(...args)
}));

vi.mock("./log", () => ({
  mainLog: {
    info: vi.fn(),
    warn: (...args: unknown[]) => warnMock(...args),
    error: vi.fn()
  }
}));

import { routeDeskBackground, tryCreateTray } from "./desk-background";

type FakeWindow = Pick<BrowserWindow, "hide" | "minimize" | "isMinimized" | "isDestroyed">;

function makeWindow(overrides: Partial<FakeWindow> = {}): BrowserWindow {
  const window: FakeWindow = {
    hide: vi.fn(),
    minimize: vi.fn(),
    isMinimized: vi.fn().mockReturnValue(false),
    isDestroyed: vi.fn().mockReturnValue(false),
    ...overrides
  };
  return window as unknown as BrowserWindow;
}

describe("routeDeskBackground", () => {
  it("hides the window on Windows when tray is available", () => {
    const window = makeWindow();
    routeDeskBackground(window, "win32", true);
    expect(window.hide).toHaveBeenCalledTimes(1);
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("hides the window on macOS when tray is available", () => {
    const window = makeWindow();
    routeDeskBackground(window, "darwin", true);
    expect(window.hide).toHaveBeenCalledTimes(1);
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("hides the window on Linux when tray is available", () => {
    const window = makeWindow();
    routeDeskBackground(window, "linux", true);
    expect(window.hide).toHaveBeenCalledTimes(1);
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("minimizes the window on Linux when tray creation failed", () => {
    const window = makeWindow();
    routeDeskBackground(window, "linux", false);
    expect(window.minimize).toHaveBeenCalledTimes(1);
    expect(window.hide).not.toHaveBeenCalled();
  });

  it("still hides on Windows even if tray is unavailable (no minimize fallback off Linux)", () => {
    const window = makeWindow();
    routeDeskBackground(window, "win32", false);
    expect(window.hide).toHaveBeenCalledTimes(1);
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("is a no-op when the window is null", () => {
    expect(() => routeDeskBackground(null, "linux", false)).not.toThrow();
  });

  it("is a no-op when the window is destroyed", () => {
    const window = makeWindow({ isDestroyed: vi.fn().mockReturnValue(true) });
    routeDeskBackground(window, "linux", false);
    expect(window.hide).not.toHaveBeenCalled();
    expect(window.minimize).not.toHaveBeenCalled();
  });

  it("does not re-minimize a window already minimized on Linux without tray", () => {
    const window = makeWindow({ isMinimized: vi.fn().mockReturnValue(true) });
    routeDeskBackground(window, "linux", false);
    expect(window.minimize).not.toHaveBeenCalled();
    expect(window.hide).not.toHaveBeenCalled();
  });
});

describe("tryCreateTray", () => {
  beforeEach(() => {
    createTrayMock.mockReset();
    warnMock.mockReset();
  });

  const trayOptions = {
    getDeskWindow: () => null,
    openHouseholdWindow: () => undefined,
    onQuit: () => undefined
  };

  it("returns true and does not warn when tray creation succeeds", () => {
    createTrayMock.mockReturnValueOnce({});
    const result = tryCreateTray(trayOptions);
    expect(result).toBe(true);
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("returns false and logs a Linux-specific warning when tray creation throws on Linux", () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      createTrayMock.mockImplementationOnce(() => {
        throw new Error("Tray host unavailable");
      });
      const result = tryCreateTray(trayOptions);
      expect(result).toBe(false);
      expect(warnMock).toHaveBeenCalledTimes(1);
      const [message, error] = warnMock.mock.calls[0] ?? [];
      expect(String(message)).toContain("minimize to the taskbar");
      expect(String(message)).not.toContain("may not be recoverable");
      expect((error as Error).message).toBe("Tray host unavailable");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    }
  });

  it("returns false and logs a non-Linux warning about potential unrecoverability when tray creation throws on Windows/macOS", () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      createTrayMock.mockImplementationOnce(() => {
        throw new Error("Tray host unavailable");
      });
      const result = tryCreateTray(trayOptions);
      expect(result).toBe(false);
      expect(warnMock).toHaveBeenCalledTimes(1);
      const [message, error] = warnMock.mock.calls[0] ?? [];
      expect(String(message)).toContain("may not be recoverable");
      expect(String(message)).toContain("unexpectedly");
      expect((error as Error).message).toBe("Tray host unavailable");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    }
  });
});
