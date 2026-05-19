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
 * when asked to perform an action. This is a discriminated union for type safety.
 */
export type AiActionDraft =
  | {
      type: "create_note";
      title: string;
      content?: string;
    }
  | {
      type: "create_task";
      title: string;
      notes?: string;
      dueAt?: string; // ISO datetime
      priority?: "low" | "medium" | "high";
    }
  | {
      type: "create_reminder";
      text: string;
      dueAt: string; // ISO datetime
    }
  | {
      type: "toggle_device";
      entityId: string;
      friendlyName?: string;
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
