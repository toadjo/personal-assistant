import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import { clearAiKey, getAiConfig, setAiKey } from "../../services/aiConfig";
import { createAdapter } from "../../services/aiProvider";
import { getAiApiKey } from "../../services/aiSecrets";
import { parseAiResponse } from "../../services/aiResponseParser";
import { registerInvoke } from "../invoke-handle";
import { aiChatRequestSchema, aiSetKeySchema } from "../schemas";
import { isAiAllowed } from "../../security/policy";
import { OutboundIntegrationBlockedError, HostNotAllowedError } from "../../security/outboundGuard";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for AI provider configuration, connection testing, and chat. */
export function registerAiHandlers(assertSender: AssertSender): void {
  registerInvoke(IpcInvoke.aiGetConfig, assertSender, () => getAiConfig());
  registerInvoke(IpcInvoke.aiSetKey, assertSender, (_event, payload) => {
    if (!isAiAllowed()) {
      throw new Error("AI integration is disabled by corporate policy.");
    }
    const parsed = aiSetKeySchema.parse(payload);
    return setAiKey(parsed.provider, parsed.apiKey);
  });
  registerInvoke(IpcInvoke.aiClearKey, assertSender, () => clearAiKey());
  registerInvoke(IpcInvoke.aiTestKey, assertSender, async () => {
    if (!isAiAllowed()) {
      throw new Error("AI integration is disabled by corporate policy.");
    }
    const config = await getAiConfig();
    if (!config.provider || !config.configured) {
      throw new Error("AI provider is not configured.");
    }
    const apiKey = await getAiApiKey();
    if (!apiKey) {
      throw new Error("AI API key is missing.");
    }
    const adapter = createAdapter(config.provider);
    try {
      const result = await adapter.testConnection(apiKey);
      // Update lastTestedAt on successful test
      const { updateLastTestedAt } = await import("../../services/aiConfig");
      await updateLastTestedAt(result.model);
      return result;
    } catch (error) {
      if (error instanceof OutboundIntegrationBlockedError || error instanceof HostNotAllowedError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
  registerInvoke(IpcInvoke.aiChat, assertSender, async (_event, payload) => {
    if (!isAiAllowed()) {
      throw new Error("AI integration is disabled by corporate policy.");
    }
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
    try {
      const rawResponse = await adapter.chat(apiKey, parsed);
      // If the provider returned an actionDraft via native tool-calling, use it directly.
      // Otherwise, fall back to text-based JSON parsing for backward compatibility.
      if (rawResponse.actionDraft) {
        return rawResponse;
      }
      return parseAiResponse(rawResponse.reply);
    } catch (error) {
      if (error instanceof OutboundIntegrationBlockedError || error instanceof HostNotAllowedError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
}
