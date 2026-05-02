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

  if (lower === "open household" || lower === "household") {
    await window.assistantApi.openHouseholdWindow();
    deps.setStatus("Opened the Household window for you.");
    return;
  }
  if (lower === "help") {
    deps.setStatus(
      "Here is what I can do: new note …, remind … in 15m, search …, list reminders, open household. In the Household window (after you link HA): toggle …, refresh devices."
    );
    return;
  }
  if (lower === "list reminders") {
    deps.setReminderFilter("pending");
    deps.setStatus("Showing your pending follow-ups.");
    return;
  }
  if (lower.startsWith("search ")) {
    const q = normalized.slice(7).trim();
    deps.setQuery(q);
    deps.setStatus(`Searching memos for “${q}”.`);
    return;
  }
  if (lower.startsWith("new note ") || lower.startsWith("note ")) {
    const text = normalized
      .replace(/^new note\s+/i, "")
      .replace(/^note\s+/i, "")
      .trim();
    if (!text) throw new Error("Add some text after “new note”—for example: new note buy coffee.");
    await window.assistantApi.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
    deps.setStatus("Got it—memo saved.");
    return;
  }
  if (lower === "new note" || lower === "note") {
    throw new Error("Tell me what to write. Example: new note buy coffee.");
  }
  if (lower.startsWith("remind ")) {
    const parsed = parseReminderCommand(normalized);
    await window.assistantApi.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`All set—reminder for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return;
  }
  if (lower === "remind") {
    throw new Error("Try something like: remind call mom in 15m");
  }
  if (lower.startsWith("toggle ")) {
    if (!deps.haReady)
      throw new Error(
        "Home Assistant is not linked yet. Open the Household window (House button, tray, or type open household), add your URL and token, then try again."
      );
    const target = raw.slice(7).trim().toLowerCase();
    const device = deps.devices.find(
      (d) => d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
    );
    if (!device) throw new Error(`I could not find a device matching “${target}”. Try refresh devices in Household.`);
    await deps.runDeviceToggle(device.entityId, device.friendlyName);
    return;
  }
  if (lower === "refresh devices") {
    if (!deps.haReady)
      throw new Error(
        "Link Home Assistant in the Household window first (URL + token), then I can refresh devices for you."
      );
    deps.setStatus("Refreshing devices from Home Assistant…");
    await deps.refreshHomeAssistantEntities();
    deps.setStatus("Device list is up to date.");
    return;
  }
  throw new Error("I do not recognize that yet. Type help for ideas, or rephrase.");
}
