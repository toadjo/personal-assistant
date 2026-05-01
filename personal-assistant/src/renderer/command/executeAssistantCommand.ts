import { normalizeCommandAlias, parseReminderCommand } from "../lib/commands";
import type { HaDeviceRow, ReminderFilter } from "../types";

export type AssistantCommandDeps = {
  rawInput: string;
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setStatus: (value: string) => void;
  refreshHomeAssistantEntities: () => Promise<void>;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
};

export async function executeAssistantCommand(deps: AssistantCommandDeps): Promise<void> {
  const raw = deps.rawInput.trim();
  if (!raw) return;

  const normalized = normalizeCommandAlias(raw);
  const lower = normalized.toLowerCase();

  if (lower === "help") {
    deps.setStatus("Try: new note <text>, remind <text> in 15m, search <term>, list reminders, toggle <device>, refresh devices.");
    return;
  }
  if (lower === "list reminders") {
    deps.setReminderFilter("pending");
    deps.setStatus("Showing pending reminders.");
    return;
  }
  if (lower.startsWith("search ")) {
    deps.setQuery(normalized.slice(7).trim());
    deps.setStatus(`Searching notes for "${normalized.slice(7).trim()}".`);
    return;
  }
  if (lower.startsWith("new note ") || lower.startsWith("note ")) {
    const text = normalized.replace(/^new note\s+/i, "").replace(/^note\s+/i, "").trim();
    if (!text) throw new Error("Write note text after 'new note'.");
    await window.assistantApi.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
    deps.setStatus("Note created from command.");
    return;
  }
  if (lower === "new note" || lower === "note") {
    throw new Error("Write note text after 'new note'. Example: new note buy coffee.");
  }
  if (lower.startsWith("remind ")) {
    const parsed = parseReminderCommand(normalized);
    await window.assistantApi.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`Reminder scheduled for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return;
  }
  if (lower === "remind") {
    throw new Error("Use a reminder command like: remind call mom in 15m");
  }
  if (lower.startsWith("toggle ")) {
    if (!deps.haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
    const target = raw.slice(7).trim().toLowerCase();
    const device = deps.devices.find(
      (d) => d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
    );
    if (!device) throw new Error(`No device matches "${target}".`);
    await deps.runDeviceToggle(device.entityId, device.friendlyName);
    return;
  }
  if (lower === "refresh devices") {
    if (!deps.haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
    deps.setStatus("Refreshing Home Assistant entities...");
    await deps.refreshHomeAssistantEntities();
    deps.setStatus("Home Assistant entities refreshed.");
    return;
  }
  throw new Error("Unknown command. Type 'help' to see supported commands.");
}
