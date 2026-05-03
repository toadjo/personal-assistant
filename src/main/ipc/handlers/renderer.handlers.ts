import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { mainLog } from "../../log";
import { persistRendererError } from "../../services/rendererErrors";
import { rendererLogPayloadSchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for renderer-reported errors (structured log + optional persistence). */
export function registerRendererHandlers(assertSender: AssertSender): void {
  ipcMain.handle(IpcInvoke.rendererLogError, (event, payload) => {
    assertSender(event);
    const parsed = rendererLogPayloadSchema.parse(payload);
    mainLog.error("[renderer:ErrorBoundary]", {
      message: parsed.message,
      stack: parsed.stack,
      componentStack: parsed.componentStack
    });
    try {
      persistRendererError(parsed);
    } catch (err) {
      mainLog.warn(`renderer_errors insert failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
