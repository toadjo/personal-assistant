/**
 * Tool registry for AI command routing.
 * Defines the structure for describing available commands/actions to the AI.
 */

import type { AiActionDraft } from "./types";

export type AiToolCategory = "notes" | "tasks" | "reminders" | "devices" | "settings" | "unknown";

/**
 * A tool parameter type. `enum` restricts the value to a fixed set of strings.
 */
export type AiToolParameterType = "string" | "number" | "boolean" | "enum";

/**
 * A tool represents a command or action the AI can suggest or execute.
 */
export type AiTool = {
  id: string;
  name: string;
  description: string;
  category: AiToolCategory;
  parameters?: Array<{
    name: string;
    type: AiToolParameterType;
    description: string;
    required: boolean;
    enum?: string[];
  }>;
};

/**
 * Tool registry containing all available tools.
 */
export type AiToolRegistry = {
  tools: AiTool[];
  version: string;
};

/**
 * Get the tool registry for local commands.
 * This is a minimal foundation that can be expanded with more tools over time.
 */
export function getLocalToolRegistry(): AiToolRegistry {
  return {
    version: "1.1.0",
    tools: [
      {
        id: "create_note",
        name: "Create Note",
        description:
          "Create a new note with a title and optional content. Use this when the user asks to remember something, jot down a note, or capture information.",
        category: "notes",
        parameters: [
          { name: "title", type: "string", description: "Note title (required)", required: true },
          { name: "content", type: "string", description: "Note content (optional)", required: false }
        ]
      },
      {
        id: "create_task",
        name: "Create Task",
        description:
          "Create a new task with title, optional notes, due date, and priority. Use this when the user asks to add a todo, create a task, or track something to do.",
        category: "tasks",
        parameters: [
          { name: "title", type: "string", description: "Task title (required)", required: true },
          { name: "notes", type: "string", description: "Task notes (optional)", required: false },
          { name: "dueAt", type: "string", description: "Due date in ISO 8601 format, e.g. 2024-12-31T23:59:59Z (optional)", required: false },
          {
            name: "priority",
            type: "enum",
            description: "Priority level (optional, defaults to normal)",
            required: false,
            enum: ["low", "medium", "high"]
          }
        ]
      },
      {
        id: "create_reminder",
        name: "Create Reminder",
        description:
          "Create a new reminder with text and due date. Use this when the user asks to remind them about something at a specific time.",
        category: "reminders",
        parameters: [
          { name: "text", type: "string", description: "Reminder text (required)", required: true },
          { name: "dueAt", type: "string", description: "Due date in ISO 8601 format, e.g. 2024-12-31T09:00:00Z (required)", required: true }
        ]
      },
      {
        id: "toggle_device",
        name: "Toggle Device",
        description:
          "Turn a Home Assistant device on or off. Use this when the user asks to toggle, turn on, or turn off a smart home device.",
        category: "devices",
        parameters: [
          { name: "entityId", type: "string", description: "Home Assistant entity ID, e.g. light.living_room (required)", required: true },
          { name: "friendlyName", type: "string", description: "Device friendly name (optional)", required: false }
        ]
      }
    ]
  };
}

// ---------------------------------------------------------------------------
// Schema generation for provider-native tool-calling
// ---------------------------------------------------------------------------

/**
 * JSON Schema object (subset used by OpenAI / Anthropic tool definitions).
 */
type JsonSchema = {
  type: "object";
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
  }>;
  required: string[];
};

/**
 * Convert an `AiTool` to a JSON Schema object describing its parameters.
 */
export function toJsonSchema(tool: AiTool): JsonSchema {
  const params = tool.parameters ?? [];
  const properties: JsonSchema["properties"] = {};
  for (const p of params) {
    properties[p.name] = {
      type: p.type === "enum" ? "string" : p.type,
      description: p.description,
      ...(p.enum ? { enum: p.enum } : {})
    };
  }
  return {
    type: "object",
    properties,
    required: params.filter((p) => p.required).map((p) => p.name)
  };
}

/**
 * OpenAI function-calling tool definition.
 */
export type OpenAiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
};

/**
 * Convert an `AiTool` to the OpenAI function-calling format.
 */
export function toOpenAiTool(tool: AiTool): OpenAiToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.id,
      description: tool.description,
      parameters: toJsonSchema(tool)
    }
  };
}

/**
 * Anthropic tool_use definition.
 */
export type AnthropicToolDefinition = {
  name: string;
  description: string;
  input_schema: JsonSchema;
};

/**
 * Convert an `AiTool` to the Anthropic tool_use format.
 */
export function toAnthropicTool(tool: AiTool): AnthropicToolDefinition {
  return {
    name: tool.id,
    description: tool.description,
    input_schema: toJsonSchema(tool)
  };
}

// ---------------------------------------------------------------------------
// Tool-call result → AiActionDraft conversion
// ---------------------------------------------------------------------------

/**
 * Convert a tool-call result (toolId + args) to an `AiActionDraft`.
 * Returns `undefined` if the toolId is unknown or required fields are missing.
 */
export function toolCallToActionDraft(
  toolId: string,
  args: Record<string, unknown>
): AiActionDraft | undefined {
  switch (toolId) {
    case "create_note": {
      const title = typeof args.title === "string" ? args.title : undefined;
      if (!title || title.length === 0) return undefined;
      return {
        type: "create_note",
        title,
        content: typeof args.content === "string" ? args.content : undefined
      };
    }
    case "create_task": {
      const title = typeof args.title === "string" ? args.title : undefined;
      if (!title || title.length === 0) return undefined;
      const priority = args.priority;
      return {
        type: "create_task",
        title,
        notes: typeof args.notes === "string" ? args.notes : undefined,
        dueAt: typeof args.dueAt === "string" ? args.dueAt : undefined,
        priority:
          priority === "low" || priority === "medium" || priority === "high" ? priority : undefined
      };
    }
    case "create_reminder": {
      const text = typeof args.text === "string" ? args.text : undefined;
      const dueAt = typeof args.dueAt === "string" ? args.dueAt : undefined;
      if (!text || text.length === 0 || !dueAt || dueAt.length === 0) return undefined;
      return { type: "create_reminder", text, dueAt };
    }
    case "toggle_device": {
      const entityId = typeof args.entityId === "string" ? args.entityId : undefined;
      if (!entityId || entityId.length === 0) return undefined;
      return {
        type: "toggle_device",
        entityId,
        friendlyName: typeof args.friendlyName === "string" ? args.friendlyName : undefined
      };
    }
    default:
      return undefined;
  }
}
