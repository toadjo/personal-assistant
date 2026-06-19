import type { IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import { ZodError } from "zod";
import { encodeAssistantInvokeFailure, IPC_VALIDATION_DEFAULT_MESSAGE } from "../../shared/invokeErrors";
import { mainLog } from "../log";
import { recordWrites } from "../services/optimizeTracker";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/**
 * Detects if an IPC channel is a write operation (mutates the database).
 * Based on channel name suffixes: create, update, delete, complete, markPaid, snooze, duplicate, setEnabled, import, reset.
 */
function isWriteChannel(channel: string): boolean {
  const writeSuffixes = [
    "create",
    "update",
    "delete",
    "complete",
    "markPaid",
    "snooze",
    "duplicate",
    "setEnabled",
    "import",
    "reset",
  ];
  return writeSuffixes.some((suffix) => channel.endsWith(suffix));
}

function validationUserMessage(err: ZodError): string {
  const issues = err.issues;
  if (issues.length === 1) {
    const path = issues[0]?.path;
    if (Array.isArray(path) && path.length === 1) {
      const key = String(path[0]);
      if (key === "title") {
        return "That request had invalid data. Check the title field.";
      }
      if (key === "text") {
        return "That request had invalid data. Check the text field.";
      }
      if (key === "url" || key === "token") {
        return "That request had invalid data. Check the Home Assistant URL or token field.";
      }
      if (key === "dueAt") {
        return "That request had invalid data. Check the date and time field.";
      }
    }
  }
  return IPC_VALIDATION_DEFAULT_MESSAGE;
}

/**
 * Registers `ipcMain.handle` with trusted-sender assertion and stable Zod to renderer error mapping.
 * Raw Zod issues are logged in main only; the renderer receives {@link IPC_VALIDATION_DEFAULT_MESSAGE} or a short field hint.
 */
export function registerInvoke(
  channel: string,
  assertSender: AssertSender,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    assertSender(event);
    try {
      const result = await handler(event, ...args);
      // Track write operations for optimize suggestions
      if (isWriteChannel(channel)) {
        recordWrites(1);
      }
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        mainLog.warn("[ipc:validation]", {
          channel,
          issues: error.flatten(),
          formErrors: error.flatten().fieldErrors
        });
        throw encodeAssistantInvokeFailure({
          domain: "ipc_validation",
          code: "INVALID_PAYLOAD",
          message: validationUserMessage(error),
          retryable: false
        });
      }
      throw error;
    }
  });
}
