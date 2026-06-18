import type { AiChatRequest, AiChatResponse } from "../../shared/ai/types";
import { getAiConfig } from "./aiConfig";
import { getAiApiKey } from "./aiSecrets";
import { createAdapter } from "./aiProvider";
import { getLocalToolRegistry, type AiToolRegistry } from "../../shared/ai/tools";

/**
 * Command routing fallback service.
 * When a command isn't recognized by the existing parser, this service can
 * route it to AI for interpretation and action suggestion.
 */

export type CommandRoutingResult = {
  handled: boolean;
  reply?: string;
  suggestedTool?: string;
};

/**
 * Attempt to route a command through AI fallback.
 * Returns a routing result with AI's interpretation and suggestions.
 */
export async function routeCommandThroughAi(
  command: string,
  context?: { notesCount?: number; tasksCount?: number; remindersCount?: number; devicesCount?: number }
): Promise<CommandRoutingResult> {
  const config = await getAiConfig();
  if (!config.provider || !config.configured) {
    return { handled: false };
  }

  const apiKey = await getAiApiKey();
  if (!apiKey) {
    return { handled: false };
  }

  try {
    const adapter = createAdapter(config.provider);
    const tools = getLocalToolRegistry();

    const request: AiChatRequest = {
      message: `User command: "${command}".\n\nAvailable tools:\n${formatToolsForAi(tools)}\n\nInterpret the command and suggest which tool (if any) should be used. Reply concisely.`,
      context
    };

    const response: AiChatResponse = await adapter.chat(apiKey, request);

    // Parse the AI response to extract tool suggestion
    const suggestedTool = extractToolSuggestion(response.reply, tools);

    return {
      handled: true,
      reply: response.reply,
      suggestedTool
    };
  } catch {
    // If AI fails, fall back to unhandled
    return { handled: false };
  }
}

/**
 * Format tools for AI context.
 */
function formatToolsForAi(registry: AiToolRegistry): string {
  return registry.tools.map((tool) => `- ${tool.name} (${tool.id}): ${tool.description}`).join("\n");
}

/**
 * Extract tool suggestion from AI response.
 * This is a simple heuristic - in production, you'd want structured parsing.
 */
function extractToolSuggestion(reply: string, registry: AiToolRegistry): string | undefined {
  const toolIds = registry.tools.map((t) => t.id);
  for (const toolId of toolIds) {
    if (reply.toLowerCase().includes(toolId.toLowerCase())) {
      return toolId;
    }
  }
  return undefined;
}
