import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserWindow } from "electron";
import { IpcRendererEvent } from "../shared/ipc-channels";

const safeWebContentsSendMock = vi.fn();
const showMainWindowMock = vi.fn();
let capturedTemplate: Array<{ label?: string; click?: () => void }> = [];

vi.mock("./ipc-safe-send", () => ({
  safeWebContentsSend: (...args: unknown[]) => safeWebContentsSendMock(...args)
}));

vi.mock("./window", () => ({
  showMainWindow: (...args: unknown[]) => showMainWindowMock(...args)
}));

vi.mock("electron", () => {
  class TrayMock {
    constructor() {}
    removeAllListeners() {}
    destroy() {}
    setContextMenu() {}
    setToolTip() {}
    on() {}
  }
  return {
    app: {
      isPackaged: false,
      getAppPath: () => process.cwd()
    },
    nativeImage: {
      createFromPath: () => ({
        isEmpty: () => false
      })
    },
    Tray: TrayMock,
    Menu: {
      buildFromTemplate: (template: Array<{ label?: string; click?: () => void }>) => {
        capturedTemplate = template;
        return { template };
      }
    }
  };
});

describe("tray IPC wiring", () => {
  beforeEach(() => {
    capturedTemplate = [];
    safeWebContentsSendMock.mockReset();
    showMainWindowMock.mockReset();
  });

  it("sends quick note command channel from tray menu", async () => {
    const { createTray } = await import("./tray");
    const webContents = {};
    const deskWindow = { webContents } as unknown as BrowserWindow;
    createTray({
      getDeskWindow: () => deskWindow,
      openHouseholdWindow: vi.fn(),
      onQuit: vi.fn()
    });

    const quickNoteItem = capturedTemplate.find((item) => item?.label === "Quick note");
    expect(quickNoteItem).toBeTruthy();
    if (!quickNoteItem?.click) throw new Error("Quick note tray item not found");
    quickNoteItem.click();

    expect(showMainWindowMock).toHaveBeenCalledWith(deskWindow);
    expect(safeWebContentsSendMock).toHaveBeenCalledWith(webContents, IpcRendererEvent.command, "new note");
  });

  it("sends show-about channel from tray menu", async () => {
    const { createTray } = await import("./tray");
    const webContents = {};
    const deskWindow = { webContents } as unknown as BrowserWindow;
    createTray({
      getDeskWindow: () => deskWindow,
      openHouseholdWindow: vi.fn(),
      onQuit: vi.fn()
    });

    const aboutItem = capturedTemplate.find((item) => item?.label === "About");
    expect(aboutItem).toBeTruthy();
    if (!aboutItem?.click) throw new Error("About tray item not found");
    aboutItem.click();

    expect(showMainWindowMock).toHaveBeenCalledWith(deskWindow);
    expect(safeWebContentsSendMock).toHaveBeenCalledWith(webContents, IpcRendererEvent.showAbout);
  });
});
