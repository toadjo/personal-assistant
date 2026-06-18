import type { AiActionDraft, AiChatResponse } from "../../shared/ai/types";

/**
 * Parse AI provider response into structured chat response.
 * Handles JSON with actionDraft, plain text, and fenced JSON blocks.
 * Invalid actionDraft fields are silently ignored.
 */
export function parseAiResponse(rawText: string): AiChatResponse {
  const trimmed = rawText.trim();

  // Try to extract fenced JSON block first
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fencedMatch ? fencedMatch[1] : trimmed;

  if (!jsonText) {
    return { reply: trimmed };
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(jsonText);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as { reply?: string; actionDraft?: unknown };

      // Extract reply
      const reply = obj.reply;
      if (typeof reply === "string" && reply.length > 0) {
        // Validate and parse actionDraft if present
        const actionDraft = validateActionDraft(obj.actionDraft);
        return {
          reply,
          actionDraft
        };
      }
    }

    // If JSON parsed but doesn't have valid reply field, fall through to plain text
  } catch {
    // Not valid JSON, fall through to plain text
  }

  // Treat entire text as reply
  return { reply: trimmed };
}

/**
 * Validate that an unknown value matches the AiActionDraft discriminated union.
 * Returns undefined for invalid drafts (they are silently ignored).
 */
function validateActionDraft(value: unknown): AiActionDraft | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const draft = value as {
    type?: string;
    title?: string;
    content?: string;
    text?: string;
    entityId?: string;
    friendlyName?: string;
    notes?: string;
    dueAt?: string;
    priority?: string;
  };

  switch (draft.type) {
    case "create_note": {
      if (typeof draft.title === "string" && draft.title.length > 0) {
        return {
          type: "create_note",
          title: draft.title,
          content: typeof draft.content === "string" ? draft.content : undefined
        };
      }
      return undefined;
    }
    case "create_task": {
      if (typeof draft.title === "string" && draft.title.length > 0) {
        return {
          type: "create_task",
          title: draft.title,
          notes: typeof draft.notes === "string" ? draft.notes : undefined,
          dueAt: typeof draft.dueAt === "string" ? draft.dueAt : undefined,
          priority:
            draft.priority === "low" || draft.priority === "medium" || draft.priority === "high"
              ? draft.priority
              : undefined
        };
      }
      return undefined;
    }
    case "create_reminder": {
      if (
        typeof draft.text === "string" &&
        draft.text.length > 0 &&
        typeof draft.dueAt === "string" &&
        draft.dueAt.length > 0
      ) {
        return {
          type: "create_reminder",
          text: draft.text,
          dueAt: draft.dueAt
        };
      }
      return undefined;
    }
    case "toggle_device": {
      if (typeof draft.entityId === "string" && draft.entityId.length > 0) {
        return {
          type: "toggle_device",
          entityId: draft.entityId,
          friendlyName: typeof draft.friendlyName === "string" ? draft.friendlyName : undefined
        };
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
