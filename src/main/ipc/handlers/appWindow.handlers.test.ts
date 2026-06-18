import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";

const handlerRegistry: Record<string, (...args: unknown[]) => unknown> = {};

describe("registerAppWindowHandlers", () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.keys(handlerRegistry).forEach((k) => delete handlerRegistry[k]);
  });

  it("registers appOpenBugReport handler that calls shell.openExternal with the fixed GitHub issues URL", async () => {
    const openExternalSpy = vi.fn();
    vi.doMock("electron", async () => {
      const actual = await vi.importActual<typeof import("electron")>("electron");
      return {
        ...actual,
        shell: {
          openExternal: openExternalSpy
        },
        ipcMain: {
          handle: vi.fn((_channel: string, handler: (...args: unknown[]) => unknown) => {
            handlerRegistry[_channel] = handler;
          })
        }
      };
    });

    const { registerAppWindowHandlers } = await import("./appWindow.handlers");
    const assertSender = vi.fn();
    registerAppWindowHandlers(assertSender, {
      openHouseholdWindow: vi.fn(),
      focusDeskWindow: vi.fn(),
      hideDeskWindow: vi.fn()
    });

    const handler = handlerRegistry[IpcInvoke.appOpenBugReport];
    expect(handler).toBeDefined();

    const fakeEvent = { sender: { id: 1, url: "" } } as unknown as IpcMainInvokeEvent;
    const result = await handler!(fakeEvent);

    expect(openExternalSpy).toHaveBeenCalledTimes(1);
    expect(openExternalSpy).toHaveBeenCalledWith("https://github.com/toadjo/Personal-Assistant-R/issues");
    expect(result).toBe(true);
    expect(assertSender).toHaveBeenCalledWith(fakeEvent);
  });
});
