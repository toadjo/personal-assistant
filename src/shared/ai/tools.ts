/**
 * Tool registry for AI command routing.
 * Defines the structure for describing available commands/actions to the AI.
 */

export type AiToolCategory = "notes" | "tasks" | "reminders" | "devices" | "settings" | "unknown";

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
    type: "string" | "number" | "boolean";
    description: string;
    required: boolean;
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
    version: "1.0.0",
    tools: [
      {
        id: "create_note",
        name: "Create Note",
        description:
          "Create a new note with a title and optional content. Returns { type: 'create_note', title, content? }",
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
          "Create a new task with title, optional notes, due date, and priority. Returns { type: 'create_task', title, notes?, dueAt?, priority? }",
        category: "tasks",
        parameters: [
          { name: "title", type: "string", description: "Task title (required)", required: true },
          { name: "notes", type: "string", description: "Task notes (optional)", required: false },
          { name: "dueAt", type: "string", description: "Due date in ISO format (optional)", required: false },
          { name: "priority", type: "string", description: "Priority: low, medium, high (optional)", required: false }
        ]
      },
      {
        id: "create_reminder",
        name: "Create Reminder",
        description: "Create a new reminder with text and due date. Returns { type: 'create_reminder', text, dueAt }",
        category: "reminders",
        parameters: [
          { name: "text", type: "string", description: "Reminder text (required)", required: true },
          { name: "dueAt", type: "string", description: "Due date in ISO format (required)", required: true }
        ]
      },
      {
        id: "toggle_device",
        name: "Toggle Device",
        description:
          "Turn a Home Assistant device on or off. Returns { type: 'toggle_device', entityId, friendlyName? }",
        category: "devices",
        parameters: [
          { name: "entityId", type: "string", description: "Home Assistant entity ID (required)", required: true },
          { name: "friendlyName", type: "string", description: "Device friendly name (optional)", required: false }
        ]
      }
    ]
  };
}
