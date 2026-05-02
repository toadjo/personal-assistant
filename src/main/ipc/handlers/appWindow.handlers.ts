import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";

type AssertSender = (event: IpcMainInvokeEvent) => void;

type WindowActions = {
  openHouseholdWindow: () => void;
  focusDeskWindow: () => void;
  hideDeskWindow: () => void;
};

export function registerAppWindowHandlers(assertSender: AssertSender, actions: WindowActions): void {
  ipcMain.handle(IpcInvoke.appOpenHouseholdWindow, (event) => {
    assertSender(event);
    actions.openHouseholdWindow();
    return true;
  });
  ipcMain.handle(IpcInvoke.appFocusDeskWindow, (event) => {
    assertSender(event);
    actions.focusDeskWindow();
    return true;
  });
  ipcMain.handle(IpcInvoke.appHideDeskWindow, (event) => {
    assertSender(event);
    actions.hideDeskWindow();
    return true;
  });
}
