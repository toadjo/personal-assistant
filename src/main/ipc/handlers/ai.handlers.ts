import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { clearAiKey, getAiConfig, setAiKey } from "../../services/aiConfig";
import { registerInvoke } from "../invoke-handle";
import { aiSetKeySchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for AI provider configuration (key storage only; no provider calls in slice 1). */
export function registerAiHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.aiGetConfig, assertSender, () => getAiConfig());
  registerInvoke(IpcInvoke.aiSetKey, assertSender, (_event, payload) => {
    const parsed = aiSetKeySchema.parse(payload);
    return setAiKey(parsed.provider, parsed.apiKey);
  });
  registerInvoke(IpcInvoke.aiClearKey, assertSender, () => clearAiKey());
}
