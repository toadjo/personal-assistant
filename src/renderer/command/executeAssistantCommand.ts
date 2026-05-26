import { normalizeCommandAlias, parseReminderCommand, parseReminderMeCommand, parseNoteAlias } from "../lib/commands";
import type { HaDeviceRow, ReminderFilter, TaskFilter } from "../types";
import type { DailyCommandCenterFilter } from "../lib/derived/daily-command-center";
import { requireAssistantApi } from "../lib/assistantApi";
import { buildSearchIndex, search } from "../lib/search/searchEngine";
import type { Note, Task, Reminder, AutomationRule } from "../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../shared/team/types";

export type AssistantCommandDeps = {
  rawInput: string;
  devices: HaDeviceRow[];
  haReady: boolean;
  setQuery: (value: string) => void;
  setReminderFilter: (value: ReminderFilter) => void;
  setTaskFilter: (value: TaskFilter) => void;
  setDailyCommandCenterFilter?: (value: DailyCommandCenterFilter) => void;
  setStatus: (value: string) => void;
  refreshHomeAssistantEntities: () => Promise<void>;
  runDeviceToggle: (entityId: string, friendlyName: string) => Promise<void>;
  onReviewDay?: () => void;
  setActivePersonalModule?: (module: "home" | "today" | "inbox" | "memos" | "reminders" | "tasks" | "automations") => void;
  onQuickCapture?: (type: "note" | "task" | "reminder" | "inbox", text: string) => void;
  onShowRecent?: () => void;
  onShowSavedSearches?: () => void;
  notes?: Note[];
  tasks?: Task[];
  reminders?: Reminder[];
  rules?: AutomationRule[];
  teamTasks?: TeamProjectTask[];
  teamProjects?: TeamProject[];
  onOpenNote?: (noteId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenReminder?: (reminderId: string) => void;
  onOpenTeamTask?: (teamTaskId: string) => void;
};

export async function executeAssistantCommand(deps: AssistantCommandDeps): Promise<{ mutated: boolean }> {
  const raw = deps.rawInput.trim();
  if (!raw) return { mutated: false };

  const normalized = normalizeCommandAlias(raw);
  const lower = normalized.toLowerCase();

  if (lower === "open household" || lower === "household" || lower === "open home") {
    const api = requireAssistantApi();
    await api.openHouseholdWindow();
    deps.setStatus("Opened the Household window for you.");
    return { mutated: false };
  }
  if (lower === "help") {
    deps.setStatus(
      "Here is what I can do: make a note ..., add note ..., add task ..., todo ..., remind me to ... in 15m, remind ... in 15m, search ..., find ..., show notes, show reminders, show tasks, plan today, show personal, show team, show household, show all, what's next, catch me up, review day, capture ..., recent, saved searches, open household. After you link Home Assistant: toggle ..., refresh devices."
    );
    return { mutated: false };
  }
  if (lower === "recent") {
    deps.onShowRecent?.();
    deps.setStatus("Showing recent items.");
    return { mutated: false };
  }
  if (lower === "saved searches" || lower === "saved") {
    deps.onShowSavedSearches?.();
    deps.setStatus("Showing saved searches.");
    return { mutated: false };
  }

  // Handle "open <item name>" command with confident top match
  if (lower.startsWith("open ")) {
    const query = normalized.slice(5).trim();
    if (!query) {
      throw new Error("Tell me what to open. Example: open meeting notes");
    }

    // Build search index and find top match
    const index = buildSearchIndex(
      deps.notes || [],
      deps.tasks || [],
      deps.reminders || [],
      deps.rules || [],
      deps.devices,
      deps.teamTasks || [],
      deps.teamProjects || []
    );

    const results = search(query, index);

    if (results.length === 0) {
      throw new Error(`No matches found for "${query}". Try a different search term.`);
    }

    // Only auto-open if top result has high confidence (exact or prefix match)
    const topResult = results[0];
    if (topResult && topResult.score >= 50) {
      const [type, rawId] = topResult.id.split(":", 2);
      const id = rawId ?? "";

      switch (type) {
        case "note":
          deps.onOpenNote?.(id);
          deps.setStatus(`Opened note: ${topResult.title}`);
          return { mutated: false };
        case "task":
          deps.onOpenTask?.(id);
          deps.setStatus(`Opened task: ${topResult.title}`);
          return { mutated: false };
        case "reminder":
          deps.onOpenReminder?.(id);
          deps.setStatus(`Opened reminder: ${topResult.title}`);
          return { mutated: false };
        case "team-task":
          deps.onOpenTeamTask?.(id);
          deps.setStatus(`Opened team task: ${topResult.title}`);
          return { mutated: false };
        default:
          throw new Error(`Cannot open ${type} items via command. Use search instead.`);
      }
    } else {
      // Low confidence - show search results instead
      deps.setQuery(query);
      deps.setStatus(`Found ${results.length} matches for "${query}". Select one to open.`);
      return { mutated: false };
    }
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
  if (lower === "plan today" || lower === "show personal" || lower === "personal") {
    deps.setDailyCommandCenterFilter?.("personal");
    deps.setStatus("Showing your personal work items.");
    return { mutated: false };
  }
  if (lower === "show team" || lower === "team") {
    deps.setDailyCommandCenterFilter?.("team");
    deps.setStatus("Showing team tasks.");
    return { mutated: false };
  }
  if (lower === "show household" || lower === "household") {
    deps.setDailyCommandCenterFilter?.("household");
    deps.setStatus("Showing household items.");
    return { mutated: false };
  }
  if (lower === "show all" || lower === "all") {
    deps.setDailyCommandCenterFilter?.("all");
    deps.setStatus("Showing all work items.");
    return { mutated: false };
  }
  if (lower === "clear notes search" || lower === "show notes") {
    deps.setQuery("");
    deps.setStatus("Showing all memos.");
    return { mutated: false };
  }
  if (
    lower === "brief" ||
    lower === "today" ||
    lower === "focus" ||
    lower === "what's next" ||
    lower === "whats next"
  ) {
    deps.setQuery("");
    deps.setStatus("Here's your focus brief for today. See the Daily Command Center for priorities.");
    return { mutated: false };
  }
  if (lower === "catch me up") {
    deps.setQuery("");
    deps.setStatus("Here's what changed while you were away. See the Daily Command Center for details.");
    return { mutated: false };
  }
  if (lower === "review day") {
    deps.setActivePersonalModule?.("today");
    deps.onReviewDay?.();
    deps.setStatus("Opening your end-of-day review.");
    return { mutated: false };
  }
  if (lower === "capture" || lower === "quick capture") {
    deps.onQuickCapture?.("inbox", "");
    deps.setStatus("Quick capture opened.");
    return { mutated: false };
  }
  if (lower.startsWith("capture note ")) {
    const text = normalized.slice(13).trim();
    deps.onQuickCapture?.("note", text);
    deps.setStatus("Quick capture opened.");
    return { mutated: false };
  }
  if (lower.startsWith("capture task ")) {
    const text = normalized.slice(13).trim();
    deps.onQuickCapture?.("task", text);
    deps.setStatus("Quick capture opened.");
    return { mutated: false };
  }
  if (lower.startsWith("capture reminder ")) {
    const text = normalized.slice(17).trim();
    deps.onQuickCapture?.("reminder", text);
    deps.setStatus("Quick capture opened.");
    return { mutated: false };
  }
  if (lower.startsWith("capture ")) {
    const text = normalized.slice(8).trim();
    deps.onQuickCapture?.("inbox", text);
    deps.setStatus("Quick capture opened.");
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
    const api = requireAssistantApi();
    await api.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
    deps.setStatus("Got it - memo saved.");
    return { mutated: true };
  }
  if (lower.startsWith("add task ") || lower.startsWith("todo ") || lower.startsWith("task ")) {
    const text = raw.replace(/^(add task|todo|task)\s+/i, "").trim();
    if (!text) throw new Error("Tell me the task title. Example: add task pay rent.");
    const api = requireAssistantApi();
    await api.createTask({
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
    const api = requireAssistantApi();
    await api.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`All set - reminder for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return { mutated: true };
  }
  if (lower.startsWith("remind ")) {
    const parsed = parseReminderCommand(normalized);
    const api = requireAssistantApi();
    await api.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
    deps.setStatus(`All set - reminder for ${new Date(parsed.dueAt).toLocaleString()}.`);
    return { mutated: true };
  }
  if (lower === "remind" || lower === "remind me to") {
    throw new Error("Try: remind me to call mom in 15m");
  }
  if (lower.startsWith("toggle ")) {
    if (!deps.haReady)
      throw new Error(
        "Home Assistant is not linked yet. Open the Household window (House button, or type open household), add your URL and token, then try again."
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
