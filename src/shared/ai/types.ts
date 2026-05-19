/**
 * Shared AI types crossing the main / renderer boundary.
 *
 * Renderer-facing status never carries the raw API key; the key lives in main process only.
 */
export const AI_PROVIDERS = ["openai", "anthropic"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiConfigStatus = {
  provider: AiProvider | null;
  configured: boolean;
  lastTestedAt: string | null;
};

/**
 * Structured action draft returned by AI. The AI should respond with JSON matching this schema
 * when asked to perform an action. This is a minimal foundation that can be expanded later.
 */
export type AiActionDraft = {
  type: "note" | "reminder" | "task" | "device" | "unknown";
  title?: string;
  content?: string;
  entityId?: string; // For device toggles
  action: "create" | "update" | "delete" | "toggle" | "unknown";
  reason: string; // Human-readable explanation of what the AI intends to do
};

/**
 * Chat request payload for AI conversation.
 */
export type AiChatRequest = {
  message: string;
  context?: {
    notesCount?: number;
    tasksCount?: number;
    remindersCount?: number;
    devicesCount?: number;
  };
};

/**
 * Chat response payload from AI.
 */
export type AiChatResponse = {
  reply: string; // Natural language response
  actionDraft?: AiActionDraft; // Optional structured action suggestion
};
