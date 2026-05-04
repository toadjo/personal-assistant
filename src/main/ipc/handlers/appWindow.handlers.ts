import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { registerInvoke } from "../invoke-handle";

type AssertSender = (event: IpcMainInvokeEvent) => void;

type WindowActions = {
  openHouseholdWindow: () => void;
  focusDeskWindow: () => void;
  hideDeskWindow: () => void;
};

/** Registers IPC handlers that focus, hide, or open auxiliary windows from the trusted renderer. */
export function registerAppWindowHandlers(assertSender: AssertSender, actions: WindowActions): void {
  registerInvoke(IpcInvoke.appOpenHouseholdWindow, assertSender, () => {
    actions.openHouseholdWindow();
    return true;
  });
  registerInvoke(IpcInvoke.appFocusDeskWindow, assertSender, () => {
    actions.focusDeskWindow();
    return true;
  });
  registerInvoke(IpcInvoke.appHideDeskWindow, assertSender, () => {
    actions.hideDeskWindow();
    return true;
  });
}
