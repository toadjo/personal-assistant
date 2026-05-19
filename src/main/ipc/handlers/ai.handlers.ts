import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { clearAiKey, getAiConfig, setAiKey } from "../../services/aiConfig";
import { createAdapter } from "../../services/aiProvider";
import { getAiApiKey } from "../../services/aiSecrets";
import { parseAiResponse } from "../../services/aiResponseParser";
import { registerInvoke } from "../invoke-handle";
import { aiChatRequestSchema, aiSetKeySchema } from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for AI provider configuration, connection testing, and chat. */
export function registerAiHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.aiGetConfig, assertSender, () => getAiConfig());
  registerInvoke(IpcInvoke.aiSetKey, assertSender, (_event, payload) => {
    const parsed = aiSetKeySchema.parse(payload);
    return setAiKey(parsed.provider, parsed.apiKey);
  });
  registerInvoke(IpcInvoke.aiClearKey, assertSender, () => clearAiKey());
  registerInvoke(IpcInvoke.aiTestKey, assertSender, async () => {
    const config = await getAiConfig();
    if (!config.provider || !config.configured) {
      throw new Error("AI provider is not configured.");
    }
    const apiKey = await getAiApiKey();
    if (!apiKey) {
      throw new Error("AI API key is missing.");
    }
    const adapter = createAdapter(config.provider);
    const result = await adapter.testConnection(apiKey);
    // Update lastTestedAt on successful test
    const { updateLastTestedAt } = await import("../../services/aiConfig");
    await updateLastTestedAt(result.model);
    return result;
  });
  registerInvoke(IpcInvoke.aiChat, assertSender, async (_event, payload) => {
    const parsed = aiChatRequestSchema.parse(payload);
    const config = await getAiConfig();
    if (!config.provider || !config.configured) {
      throw new Error("AI provider is not configured.");
    }
    const apiKey = await getAiApiKey();
    if (!apiKey) {
      throw new Error("AI API key is missing.");
    }
    const adapter = createAdapter(config.provider);
    const rawResponse = await adapter.chat(apiKey, parsed);
    // Parse the response to extract JSON and actionDraft if present
    return parseAiResponse(rawResponse.reply);
  });
}
