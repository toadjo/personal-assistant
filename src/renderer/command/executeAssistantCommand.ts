import { normalizeCommandAlias, parseReminderCommand, parseReminderMeCommand, parseNoteAlias } from "../lib/commands";
import type { HaDeviceRow, ReminderFilter, TaskFilter } from "../types";

export type AssistantCommandDeps = {
  rawInput: string;
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setTaskFilter: (value: TaskFilter) => void;
  setStatus: (value: string) => void;
  refreshHomeAssistantEntities: () => Promise<void>;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
};

export async function executeAssistantCommand(deps: AssistantCommandDeps): Promise<{ mutated: boolean }> {
  const raw = deps.rawInput.trim();
  if (!raw) return { mutated: false };

  const normalized = normalizeCommandAlias(raw);
  const lower = normalized.toLowerCase();

  if (lower === "open household" || lower === "household" || lower === "open home") {
    await window.assistantApi.openHouseholdWindow();
    deps.setStatus("Opened the Household window for you.");
    return { mutated: false };
  }
  if (lower === "help") {
    deps.setStatus(
      "Here is what I can do: make a note ..., add note ..., add task ..., todo ..., remind me to ... in 15m, remind ... in 15m, search ..., find ..., show notes, show reminders, show tasks, open household, open home. In the Household window (after you link HA): toggle ..., refresh devices."
    );
    return { mutated: false };
  }
  if (lower === "list reminders" || lower === "show reminders") {
    deps.setReminderFilter("pending");
    deps.setStatus("Showing your pending follow-ups.");
    return { mutated: false };
  }
  if (lower === "show tasks") {
    deps.setTaskFilter("open");
    deps.setStatus("Showing your open tasks.");
    return { mutated: false };
  }
  if (lower === "clear notes search" || lower === "show notes") {
    deps.setQuery("");
    deps.setStatus("Showing all memos.");
    return { mutated: false };
  }
  if (lower === "brief" || lower === "today" || lower === "focus" || lower === "what's next" || lower === "whats next") {
    deps.setQuery("");
    deps.setStatus("Here's your focus brief for today. See the Today panel for priorities.");
    return { mutated: false };
  }
  if (lower.startsWith("find ")) {
    const q = normalized.slice(5).trim();
    if (!q) throw new Error("Tell me what to find. Example: find invoice.");
    deps.setQuery(q);
    deps.setStatus(`Searching memos for "${q}".`);
    return { mutated: false };
  }
  if (lower === "find") {
    throw new Error("Tell me what to find. Example: find invoice.");
  }
  if (lower.startsWith("search ")) {
    const q = normalized.slice(7).trim();
    deps.setQuery(q);
    deps.setStatus(`Searching memos for "${q}".`);
    return { mutated: false };
  }
  if (
    lower.startsWith("new note ") ||
    lower.startsWith("note ") ||
    lower.startsWith("make a note ") ||
    lower.startsWith("add note ") ||
    lower.startsWith("remember ")
  ) {
    const text = parseNoteAlias(raw);
    if (!text) throw new Error("Tell me what to save. Example: make a note buy coffee.");
    await window.assistantApi.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
    deps.setStatus("Got it - memo saved.");
    return { mutated: true };
  }
  if (lower.startsWith("add task ") || lower.startsWith("todo ") || lower.startsWith("task ")) {
    const text = raw.replace(/^(add task|todo|task)\s+/i, "").trim();
    if (!text) throw new Error("Tell me the task title. Example: add task pay rent.");
    await window.assistantApi.createTask({
      title: text,
      notes: "",
      dueAt: null,
      priority: "normal",
      recurrence: "none"
    });
    deps.setStatus("Task created.");
    return { mutated: true };
  }
  if (lower === "add task" || lower === "todo" || lower === "task") {
    throw new Error("Tell me the task title. Example: add task pay rent.");
  }
  if (
    lower === "new note" ||
    lower === "note" ||
    lower === "make a note" ||
    lower === "add note" ||
    lower === "remember"
  ) {
    throw new Error("Tell me what to save. Example: make a note buy coffee.");
  }
  if (lower.startsWith("remind me to ")) {
    const parsed = parseReminderMeCommand(normalized);
    await window.assistantApi.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`All set - reminder for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return { mutated: true };
  }
  if (lower.startsWith("remind ")) {
    const parsed = parseReminderCommand(normalized);
    await window.assistantApi.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`All set - reminder for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return { mutated: true };
  }
  if (lower === "remind" || lower === "remind me to") {
    throw new Error("Try: remind me to call mom in 15m");
  }
  if (lower.startsWith("toggle ")) {
    if (!deps.haReady)
      throw new Error(
        "Home Assistant is not linked yet. Open the Household window (House button, tray, or type open household), add your URL and token, then try again."
      );
    const target = raw.slice(7).trim().toLowerCase();
    const matchingDevices = deps.devices.filter(
      (d) => d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
    );
    if (matchingDevices.length === 0)
      throw new Error(`I could not find a device matching "${target}". Try refresh devices in Household.`);
    if (matchingDevices.length > 1) {
      const names = matchingDevices
        .slice(0, 3)
        .map((d) => d.friendlyName)
        .join(", ");
      throw new Error(`I found multiple devices matching "${target}": ${names}. Try the full device name.`);
    }
    const device = matchingDevices[0]!;
    await deps.runDeviceToggle(device.entityId, device.friendlyName);
    return { mutated: true };
  }
  if (lower === "refresh devices") {
    if (!deps.haReady)
      throw new Error(
        "Link Home Assistant in the Household window first (URL + token), then I can refresh devices for you."
      );
    deps.setStatus("Refreshing devices from Home Assistant...");
    await deps.refreshHomeAssistantEntities();
    deps.setStatus("Device list is up to date.");
    return { mutated: true };
  }
  throw new Error("I do not recognize that yet. Type help for ideas, or rephrase.");
}
