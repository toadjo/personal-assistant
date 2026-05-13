import { describe, expect, it, vi } from "vitest";
import { applyWindowSecurityPolicy } from "./window";

const isTrustedNavigationTarget = vi.fn();

vi.mock("./security", () => ({
  isTrustedNavigationTarget: (...args: unknown[]) => isTrustedNavigationTarget(...args)
}));

describe("applyWindowSecurityPolicy", () => {
  it("denies all window.open requests via setWindowOpenHandler", () => {
    const setWindowOpenHandler = vi.fn();
    const on = vi.fn();
    const webContents = { setWindowOpenHandler, on } as unknown as Electron.WebContents;

    applyWindowSecurityPolicy(webContents);

    expect(setWindowOpenHandler).toHaveBeenCalledTimes(1);
    const handler = setWindowOpenHandler.mock.calls[0]![0] as () => { action: string };
    expect(handler()).toEqual({ action: "deny" });
  });

  it("allows will-navigate when target is trusted", () => {
    const setWindowOpenHandler = vi.fn();
    const on = vi.fn();
    const preventDefault = vi.fn();
    const webContents = { setWindowOpenHandler, on } as unknown as Electron.WebContents;

    applyWindowSecurityPolicy(webContents);

    const willNavigateHandler = on.mock.calls.find((c) => c[0] === "will-navigate")?.[1];
    expect(willNavigateHandler).toBeDefined();

    isTrustedNavigationTarget.mockReturnValue(true);
    const event = { preventDefault } as unknown as Electron.Event;
    willNavigateHandler!(event, "https://trusted.example.com");

    expect(isTrustedNavigationTarget).toHaveBeenCalledWith("https://trusted.example.com");
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("prevents will-navigate when target is untrusted", () => {
    const setWindowOpenHandler = vi.fn();
    const on = vi.fn();
    const preventDefault = vi.fn();
    const webContents = { setWindowOpenHandler, on } as unknown as Electron.WebContents;

    applyWindowSecurityPolicy(webContents);

    const willNavigateHandler = on.mock.calls.find((c) => c[0] === "will-navigate")?.[1];
    expect(willNavigateHandler).toBeDefined();

    isTrustedNavigationTarget.mockReturnValue(false);
    const event = { preventDefault } as unknown as Electron.Event;
    willNavigateHandler!(event, "https://evil.example.com");

    expect(isTrustedNavigationTarget).toHaveBeenCalledWith("https://evil.example.com");
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
