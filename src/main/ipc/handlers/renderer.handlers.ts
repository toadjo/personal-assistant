import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { mainLog } from "../../log";
import { rendererLogPayloadSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

export function registerRendererHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.rendererLogError, (event, payload) => {
    assertSender(event);
    const parsed = rendererLogPayloadSchema.parse(payload);
    mainLog.error("[renderer:ErrorBoundary]", {
      message: parsed.message,
      stack: parsed.stack,
      componentStack: parsed.componentStack
    });
  });
}
