import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Note, Reminder } from "../shared/types";

type ThemeMode = "light" | "dark";
type CommandIntent =
  | "help"
  | "listPendingReminders"
  | "showAllReminders"
  | "showOverdue"
  | "searchNotes"
  | "clearSearch"
  | "createNote"
  | "createReminder"
  | "toggleDevice"
  | "refreshAll"
  | "refreshDevices"
  | "unknown";
type ParsedCommand = { intent: CommandIntent; args?: string; normalizedInput: string };
type HaSetupState = "missingUrl" | "missingToken" | "ready";
type HaRecoveryContext = "saving setup" | "testing connection" | "refreshing entities" | "toggling device";

const INITIAL_VISIBLE_ITEMS = 12;
const VISIBLE_ITEMS_STEP = 20;
type WorkspaceSection = "dashboard" | "productivity" | "integrations" | "automation";
const SECTION_LABEL_MAP: Record<WorkspaceSection, string> = {
  productivity: "Tasks",
  dashboard: "Command",
  integrations: "Home",
  automation: "Rules"
};
const COMMAND_EXAMPLES = [
  "help",
  "new note Buy milk",
  "note Draft release checklist",
  "remind Call mom in 15m",
  "remind Send report at 16:30",
  "search groceries",
  "clear search",
  "list reminders",
  "show all reminders",
  "show overdue",
  "toggle kitchen light",
  "refresh",
  "refresh devices"
] as const;
const COMMAND_EXAMPLES_WITH_LOWER = COMMAND_EXAMPLES.map((sample) => ({ sample, lower: sample.toLowerCase() }));
const SECTION_ORDER: WorkspaceSection[] = ["productivity", "dashboard", "integrations", "automation"];

export function App(): JSX.Element {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [hasHaToken, setHasHaToken] = useState(false);
  const [devices, setDevices] = useState<Array<{ entityId: string; friendlyName: string; state: string }>>([]);
  const [logs, setLogs] = useState<Array<{
    id: string;
    ruleId: string;
    status: string;
    startedAt: string;
    endedAt: string;
    error?: string;
    ruleName: string;
    actionLabel: string;
  }>>([]);
  const [rules, setRules] = useState<Array<{
    id: string;
    name: string;
    triggerConfig: { at: string };
    actionType: "localReminder" | "haToggle";
    actionConfig: Record<string, string>;
  }>>([]);
  const [commandInput, setCommandInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isRefreshingHa, setIsRefreshingHa] = useState(false);
  const [isSavingHa, setIsSavingHa] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [notesVisible, setNotesVisible] = useState(INITIAL_VISIBLE_ITEMS);
  const [remindersVisible, setRemindersVisible] = useState(INITIAL_VISIBLE_ITEMS);
  const [devicesVisible, setDevicesVisible] = useState(INITIAL_VISIBLE_ITEMS);
  const [logsVisible, setLogsVisible] = useState(INITIAL_VISIBLE_ITEMS);
  const [rulesVisible, setRulesVisible] = useState(INITIAL_VISIBLE_ITEMS);
  const [reminderFilter, setReminderFilter] = useState<"all" | "pending" | "done">("pending");
  const [logFilter, setLogFilter] = useState<"all" | "failed" | "success">("all");
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(new Date()));
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem("assistant-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("productivity");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const quickNoteTitleRef = useRef<HTMLInputElement>(null);
  const haUrlInputRef = useRef<HTMLInputElement>(null);
  const ruleNameInputRef = useRef<HTMLInputElement>(null);
  const latestRefreshRef = useRef(0);
  const queryRef = useRef(query);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !window.localStorage.getItem("assistant-onboarded"));

  const setQueryWithVisibilityReset = useCallback((nextQuery: string) => {
    setQuery((previousQuery) => {
      if (previousQuery === nextQuery) return previousQuery;
      setNotesVisible(INITIAL_VISIBLE_ITEMS);
      return nextQuery;
    });
  }, []);
  const setReminderFilterWithVisibilityReset = useCallback((nextFilter: "all" | "pending" | "done") => {
    setReminderFilter((previousFilter) => {
      if (previousFilter === nextFilter) return previousFilter;
      setRemindersVisible(INITIAL_VISIBLE_ITEMS);
      return nextFilter;
    });
  }, []);

  const getSectionButtonId = useCallback((section: WorkspaceSection) => `section-tab-${section}`, []);
  const getSectionPanelId = useCallback((section: WorkspaceSection) => `section-panel-${section}`, []);
  const handleFormError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleTopNavKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, section: WorkspaceSection) => {
    const currentIndex = SECTION_ORDER.indexOf(section);
    if (currentIndex === -1) return;
    let targetSection: WorkspaceSection | null = null;
    if (event.key === "ArrowRight") {
      targetSection = SECTION_ORDER[(currentIndex + 1) % SECTION_ORDER.length];
    } else if (event.key === "ArrowLeft") {
      targetSection = SECTION_ORDER[(currentIndex - 1 + SECTION_ORDER.length) % SECTION_ORDER.length];
    } else if (event.key === "Home") {
      targetSection = SECTION_ORDER[0];
    } else if (event.key === "End") {
      targetSection = SECTION_ORDER[SECTION_ORDER.length - 1];
    }
    if (!targetSection) return;
    event.preventDefault();
    setActiveSection(targetSection);
    requestAnimationFrame(() => {
      document.getElementById(getSectionButtonId(targetSection as WorkspaceSection))?.focus();
    });
  }, [getSectionButtonId]);
  const selectCalendarDateByOffset = useCallback((offsetDays: number) => {
    const selectedDate = parseDateKey(selectedDateKey);
    if (!selectedDate) return;
    const nextDate = addDays(selectedDate, offsetDays);
    setSelectedDateKey(toLocalDateKey(nextDate));
    setCalendarCursor(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [selectedDateKey]);
  const handleCalendarGridKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") selectCalendarDateByOffset(-1);
    if (event.key === "ArrowRight") selectCalendarDateByOffset(1);
    if (event.key === "ArrowUp") selectCalendarDateByOffset(-7);
    if (event.key === "ArrowDown") selectCalendarDateByOffset(7);
    if (event.key === "Home") {
      const selectedDate = parseDateKey(selectedDateKey);
      if (!selectedDate) return;
      selectCalendarDateByOffset(-selectedDate.getDay());
    }
    if (event.key === "End") {
      const selectedDate = parseDateKey(selectedDateKey);
      if (!selectedDate) return;
      selectCalendarDateByOffset(6 - selectedDate.getDay());
    }
    if (event.key === "PageUp") {
      const selectedDate = parseDateKey(selectedDateKey);
      if (!selectedDate) return;
      const nextDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, selectedDate.getDate());
      setSelectedDateKey(toLocalDateKey(nextDate));
      setCalendarCursor(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
    if (event.key === "PageDown") {
      const selectedDate = parseDateKey(selectedDateKey);
      if (!selectedDate) return;
      const nextDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate());
      setSelectedDateKey(toLocalDateKey(nextDate));
      setCalendarCursor(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
  }, [selectedDateKey, selectCalendarDateByOffset]);

  const refreshNotes = useCallback(async (searchTerm: string): Promise<void> => {
    const nextNotes = await window.assistantApi.listNotes(searchTerm);
    setNotes(nextNotes);
  }, []);

  const refreshReminders = useCallback(async (): Promise<void> => {
    const nextReminders = await window.assistantApi.listReminders();
    setReminders(nextReminders);
  }, []);
  const completeReminderWithFeedback = useCallback(async (id: string, options?: { quiet?: boolean }): Promise<void> => {
    await window.assistantApi.completeReminder(id);
    if (!options?.quiet) setStatus("Reminder marked as done.");
    await refreshReminders();
  }, [refreshReminders]);
  const snoozeReminderWithFeedback = useCallback(async (id: string, minutes: number, options?: { quiet?: boolean }): Promise<void> => {
    await window.assistantApi.snoozeReminder(id, minutes);
    if (!options?.quiet) setStatus(`Reminder snoozed by ${formatSnoozeLabel(minutes)}.`);
    await refreshReminders();
  }, [refreshReminders]);
  const deleteReminderWithFeedback = useCallback(async (id: string, options?: { quiet?: boolean }): Promise<void> => {
    await window.assistantApi.deleteReminder(id);
    if (!options?.quiet) setStatus("Reminder deleted.");
    await refreshReminders();
  }, [refreshReminders]);

  const refreshDevices = useCallback(async (): Promise<void> => {
    const nextDevices = await window.assistantApi.listDevices();
    setDevices(nextDevices);
  }, []);

  const refreshAll = useCallback(async (): Promise<void> => {
    const refreshId = Date.now();
    latestRefreshRef.current = refreshId;
    try {
      setError("");
      setIsRefreshing(true);
      const [nextNotes, nextReminders, nextDevices, [nextLogs, nextRules]] = await Promise.all([
        window.assistantApi.listNotes(queryRef.current),
        window.assistantApi.listReminders(),
        window.assistantApi.listDevices(),
        Promise.all([window.assistantApi.listExecutionLogs(), window.assistantApi.listRules()])
      ]);
      if (latestRefreshRef.current !== refreshId) return;
      setNotes(nextNotes);
      setReminders(nextReminders);
      setDevices(nextDevices);
      setLogs(nextLogs);
      setRules(nextRules);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (latestRefreshRef.current === refreshId) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    void refreshAll();
    const off = window.assistantApi.onRemindersUpdated(() => void refreshReminders());
    return off;
  }, [refreshAll, refreshReminders]);

  useEffect(() => {
    void (async () => {
      try {
        const config = await window.assistantApi.getHomeAssistantConfig();
        if (config.url) setHaUrl(config.url);
        setHasHaToken(config.hasToken);
        // Keep startup quiet and only surface actionable status/error messages.
      } catch {
        // Keep startup resilient even if config read fails.
      }
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refreshNotes(query), 150);
    return () => clearTimeout(id);
  }, [query, refreshNotes]);

  useEffect(() => {
    const off = window.assistantApi.onCommand((_, command) => {
      setCommandInput(command === "new note" ? "new note " : command);
      commandInputRef.current?.focus();
    });
    return off;
  }, []);

  useEffect(() => {
    function onWindowKeyDown(event: globalThis.KeyboardEvent): void {
      const isCommandPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isCommandPaletteShortcut) return;
      event.preventDefault();
      setActiveSection("dashboard");
      commandInputRef.current?.focus();
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);
  useEffect(() => {
    function onWindowKeyDown(event: globalThis.KeyboardEvent): void {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const nextSection: WorkspaceSection | null =
        event.key === "1"
          ? "productivity"
          : event.key === "2"
            ? "dashboard"
            : event.key === "3"
              ? "integrations"
              : event.key === "4"
                ? "automation"
                : null;
      if (!nextSection) return;
      event.preventDefault();
      setActiveSection(nextSection);
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);

  useEffect(() => {
    if (!status && !error) return;
    const id = setTimeout(() => {
      setStatus("");
      setError("");
    }, 4500);
    return () => clearTimeout(id);
  }, [status, error]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("assistant-theme", theme);
  }, [theme]);

  const commandHints = useMemo(() => {
    const term = commandInput.trim().toLowerCase();
    const ranked = COMMAND_EXAMPLES_WITH_LOWER
      .map(({ sample, lower }) => {
        const rank = !term ? 2 : lower.startsWith(term) ? 0 : lower.includes(term) ? 1 : 3;
        return { sample, rank };
      })
      .filter((entry) => entry.rank < 3)
      .sort((a, b) => a.rank - b.rank || a.sample.length - b.sample.length)
      .map((entry) => entry.sample);
    return ranked.slice(0, 5);
  }, [commandInput]);
  const pendingReminders = useMemo(() => reminders.filter((r) => r.status === "pending"), [reminders]);
  const doneRemindersCount = useMemo(() => reminders.filter((r) => r.status === "done").length, [reminders]);
  const overdueReminders = useMemo(
    () => {
      const nowTimestamp = Date.now();
      return pendingReminders.filter((r) => new Date(r.dueAt).getTime() < nowTimestamp);
    },
    [pendingReminders]
  );
  const visibleReminders = useMemo(
    () => reminders.filter((r) => reminderFilter === "all" || r.status === reminderFilter),
    [reminders, reminderFilter]
  );
  const haReady = Boolean(haUrl.trim() && (hasHaToken || haToken.trim()));
  const canSaveHaConfig = Boolean(haUrl.trim() && (hasHaToken || haToken.trim()));
  const haSetupState: HaSetupState = !haUrl.trim() ? "missingUrl" : (hasHaToken || haToken.trim()) ? "ready" : "missingToken";
  const haReadinessLabel =
    haSetupState === "ready" ? "Ready to control devices" : haSetupState === "missingUrl" ? "URL required" : "Token required";
  const haPrimaryActionLabel = haSetupState === "ready" ? "Save updates" : "Save setup";
  const haReadinessHint =
    haSetupState === "ready"
      ? hasHaToken && !haToken.trim()
        ? "Saved token detected. Add a new token only when rotating credentials."
        : "Save any changes, then run Test connection and Refresh entities."
      : "Complete URL and token, then click Save setup.";
  const haSetupChecklist = [
    `1) ${hasHaToken ? "Use saved token or paste a replacement token." : "Paste URL and long-lived token."}`,
    "2) Run Test connection.",
    "3) Run Refresh entities to sync devices."
  ];
  const remindersByDate = useMemo(() => {
    const byDate = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
      if (reminder.status !== "pending") continue;
      const key = toLocalDateKey(new Date(reminder.dueAt));
      const existing = byDate.get(key);
      if (existing) {
        existing.push(reminder);
      } else {
        byDate.set(key, [reminder]);
      }
    }
    return byDate;
  }, [reminders]);
  const monthCells = useMemo(() => buildCalendarCells(calendarCursor, remindersByDate), [calendarCursor, remindersByDate]);
  const selectedDateIndex = useMemo(
    () => monthCells.findIndex((cell) => cell.dateKey === selectedDateKey),
    [monthCells, selectedDateKey]
  );
  const todayKey = toLocalDateKey(new Date());
  const remindersSortedByDueAt = useMemo(() => {
    const sorted = reminders.slice();
    sorted.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return sorted;
  }, [reminders]);
  const selectedDayReminders = useMemo(
    () =>
      remindersSortedByDueAt.filter((r) => toLocalDateKey(new Date(r.dueAt)) === selectedDateKey),
    [remindersSortedByDueAt, selectedDateKey]
  );
  const todayAgenda = useMemo(
    () =>
      remindersSortedByDueAt.filter((r) => r.status === "pending" && toLocalDateKey(new Date(r.dueAt)) === todayKey),
    [remindersSortedByDueAt, todayKey]
  );
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);
  const visibleNotesSlice = useMemo(() => notes.slice(0, notesVisible), [notes, notesVisible]);
  const visibleRemindersSlice = useMemo(
    () => visibleReminders.slice(0, remindersVisible),
    [visibleReminders, remindersVisible]
  );
  const visibleDevicesSlice = useMemo(() => devices.slice(0, devicesVisible), [devices, devicesVisible]);
  const visibleRulesSlice = useMemo(() => rules.slice(0, rulesVisible), [rules, rulesVisible]);
  const filteredLogs = useMemo(
    () => logs.filter((logEntry) => logFilter === "all" || logEntry.status === logFilter),
    [logs, logFilter]
  );
  const visibleFilteredLogsSlice = useMemo(
    () => filteredLogs.slice(0, logsVisible),
    [filteredLogs, logsVisible]
  );
  const failedLogsCount = useMemo(
    () => logs.filter((logEntry) => logEntry.status === "failed").length,
    [logs]
  );
  const successfulLogsCount = useMemo(
    () => logs.filter((logEntry) => logEntry.status === "success").length,
    [logs]
  );
  const selectedDateLabel = useMemo(() => formatDateLabel(selectedDateKey), [selectedDateKey]);
  const selectedMonthLabel = useMemo(
    () => calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" }),
    [calendarCursor]
  );
  const commandHelpMessage = useMemo(() => buildCommandHelpMessage(), []);
  const parseCommand = useCallback((rawInput: string): ParsedCommand => parseCommandInput(rawInput), []);

  function runPresetCommand(command: string): void {
    setCommandInput(command);
    void runCommandInternal(command);
  }

  async function runCommandInternal(rawInput: string): Promise<void> {
    const raw = rawInput.trim();
    if (!raw || isRunningCommand) return;
    try {
      setError("");
      setIsRunningCommand(true);
      const parsed = parseCommand(raw);
      let clearInputAfterRun = true;
      switch (parsed.intent) {
        case "help":
          setStatus(commandHelpMessage);
          break;
        case "listPendingReminders":
          setActiveSection("productivity");
          setReminderFilterWithVisibilityReset("pending");
          setStatus("Showing pending reminders.");
          break;
        case "showAllReminders":
          setActiveSection("productivity");
          setReminderFilterWithVisibilityReset("all");
          setStatus("Showing all reminders.");
          break;
        case "showOverdue":
          setActiveSection("productivity");
          setReminderFilterWithVisibilityReset("pending");
          setStatus("Showing pending reminders. Overdue items are marked.");
          break;
        case "searchNotes":
          setActiveSection("productivity");
          setQueryWithVisibilityReset(parsed.args ?? "");
          setStatus(`Searching notes for "${parsed.args ?? ""}".`);
          break;
        case "clearSearch":
          setActiveSection("productivity");
          setQueryWithVisibilityReset("");
          setStatus("Cleared note search.");
          break;
        case "createNote": {
          setActiveSection("productivity");
          const text = parsed.args ?? "";
          await window.assistantApi.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
          await refreshNotes(queryRef.current);
          setStatus("Note created from command.");
          break;
        }
        case "createReminder": {
          setActiveSection("productivity");
          const reminder = parseReminderCommand(parsed.args ?? "");
          await window.assistantApi.createReminder({ text: reminder.text, dueAt: reminder.dueAt, recurrence: "none" });
          await refreshReminders();
          setStatus(`Reminder scheduled for ${new Date(reminder.dueAt).toLocaleString()}.`);
          break;
        }
        case "toggleDevice": {
          setActiveSection("integrations");
          if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
          const target = (parsed.args ?? "").toLowerCase();
          const matches = devices.filter((d) =>
            d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
          );
          if (!matches.length) {
            const suggestions = devices
              .slice(0, 3)
              .map((d) => d.friendlyName)
              .join(", ");
            throw new Error(
              suggestions
                ? `No device matches "${target}". Try: ${suggestions}.`
                : "No synced devices available. Refresh entities first."
            );
          }
          if (matches.length > 1) {
            const options = matches
              .slice(0, 3)
              .map((d) => `${d.friendlyName} (${d.entityId})`)
              .join(", ");
            throw new Error(`"${target}" matches multiple devices. Be more specific: ${options}.`);
          }
          const [device] = matches;
          await window.assistantApi.toggleDevice(device.entityId);
          await refreshDevices();
          setStatus(`Toggled ${device.friendlyName}.`);
          break;
        }
        case "refreshAll":
          await refreshAll();
          setStatus("Assistant data refreshed.");
          break;
        case "refreshDevices":
          setActiveSection("integrations");
          if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
          await window.assistantApi.refreshHomeAssistantEntities();
          await refreshDevices();
          setStatus("Home Assistant devices refreshed.");
          break;
        default:
          clearInputAfterRun = false;
          throw new Error(`Unknown command: "${parsed.normalizedInput}". Type "help" to see supported commands.`);
      }
      if (clearInputAfterRun) {
        setCommandInput("");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRunningCommand(false);
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <div className="heroLead">
          <h1>Personal Assistant</h1>
          <p className="subtitle">Task-first workspace for reminders and notes.</p>
        </div>
        <div className="heroStats">
          <span className="stat statPrimary">Pending reminders: {pendingReminders.length}</span>
          <span className="stat">Overdue: {overdueReminders.length}</span>
          <button
            className="themeToggle"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            aria-label="Toggle light and dark theme"
          >
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </div>
      </header>
      <nav className="topNav" aria-label="Workspace sections" role="tablist" aria-orientation="horizontal">
        {SECTION_ORDER.map((section) => (
          <button
            key={section}
            id={getSectionButtonId(section)}
            role="tab"
            aria-selected={activeSection === section}
            aria-controls={getSectionPanelId(section)}
            tabIndex={activeSection === section ? 0 : -1}
            className={`topNavButton ${activeSection === section ? "topNavButtonActive" : ""}`}
            onClick={() => setActiveSection(section)}
            onKeyDown={(event) => handleTopNavKeyDown(event, section)}
          >
            {SECTION_LABEL_MAP[section]}
          </button>
        ))}
      </nav>
      {status ? <p className="status" role="status" aria-live="polite" aria-atomic="true">Success: {status}</p> : null}
      {error ? <p className="error" role="alert" aria-live="assertive" aria-atomic="true">Error: {error}</p> : null}

      {activeSection === "dashboard" && showOnboarding ? (
        <details className="panel onboarding collapsibleGroup" open>
          <summary className="titleRow collapsibleSummary">
            <h2>Quick Start</h2>
          </summary>
          <p className="muted">1) Add your Home Assistant URL + token, then click <strong>Refresh Entities</strong>.</p>
          <p className="muted">2) Use the command prompt for fast actions in plain English.</p>
          <p className="muted">3) Closing the window keeps the app running in the Windows tray.</p>
          <div className="presetRow">
            <button className="ghostButton" onClick={() => runPresetCommand("new note check water filter")}>Create sample note</button>
            <button className="ghostButton" onClick={() => runPresetCommand("remind stretch in 10m")}>Create sample reminder</button>
            <button className="ghostButton" onClick={() => runPresetCommand("list reminders")}>Show reminders</button>
            <button
              className="ghostButton"
              onClick={() => {
                setShowOnboarding(false);
                window.localStorage.setItem("assistant-onboarded", "1");
              }}
            >
              Dismiss onboarding
            </button>
          </div>
        </details>
      ) : null}

      {activeSection === "dashboard" ? <div className="grid" id={getSectionPanelId("dashboard")} role="tabpanel" aria-labelledby={getSectionButtonId("dashboard")}>
        <section className="panel commandPanel">
          <div className="titleRow">
            <h2>Command Prompt</h2>
            <span className="pill">Primary action</span>
          </div>
          <p className="muted sectionIntro">Type one command and press Enter. Use <code>help</code> for all commands.</p>
          <form
            className="row commandRow"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isRunningCommand) void runCommandInternal(commandInput);
            }}
          >
            <label className="srOnly" htmlFor="assistant-command-input">Assistant command</label>
            <input
              id="assistant-command-input"
              ref={commandInputRef}
              className="fullWidth"
              placeholder="Type a command and press Enter..."
              value={commandInput}
              aria-label="Assistant command input"
              aria-keyshortcuts="Control+K Meta+K Escape"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setCommandInput("");
                }
              }}
              onChange={(e) => setCommandInput(e.target.value)}
            />
            <button type="submit" className="commandAction" disabled={isRunningCommand}>
              {isRunningCommand ? "Running..." : "Run"}
            </button>
          </form>
          <div className="row commandHintsRow">
            {commandHints.length ? commandHints.map((hint) => (
              <button type="button" key={hint} className="pillButton" onClick={() => runPresetCommand(hint)}>{hint}</button>
            )) : <span className="muted">No matching command hints.</span>}
          </div>
          <p className="muted assistantTip">Shortcuts: Ctrl/Cmd+K focuses command input, Alt+1..4 switches sections, Escape clears.</p>
        </section>

        <section className="panel compactPanel">
          <div className="titleRow">
            <h2>Quick Actions</h2>
          </div>
          <div className="assistantShortcutRow">
            <button type="button" className="ghostButton" onClick={() => runPresetCommand("help")}>Show commands</button>
            <button type="button" className="ghostButton" onClick={() => runPresetCommand("refresh")}>Refresh data</button>
            <button type="button" className="ghostButton" onClick={() => setCommandInput("new note ")}>New note</button>
            <button type="button" className="ghostButton" onClick={() => setCommandInput("remind ")}>New reminder</button>
            <button type="button" className="ghostButton" onClick={() => setCommandInput("toggle ")} disabled={!haReady}>Toggle device</button>
          </div>
          <ul className="list compactList">
            <li>Notes: {notes.length}</li>
            <li>Pending reminders: {pendingReminders.length}</li>
            <li>Overdue: {overdueReminders.length}</li>
            <li>Home Assistant: {haReady ? "Ready" : "Setup needed"}</li>
          </ul>
        </section>
      </div> : null}

      {activeSection === "productivity" ? <details className="panel collapsibleGroup" id={getSectionPanelId("productivity")} role="tabpanel" aria-labelledby={getSectionButtonId("productivity")}>
        <summary className="titleRow collapsibleSummary">
          <h2>Productivity Snapshot</h2>
          <span className="pill graphitePill">Overview</span>
        </summary>
        <p className="muted sectionIntro">Open for notes/reminders snapshot and monthly calendar context.</p>
        <div className="grid compactGrid">
        <section className="panel">
          <div className="titleRow">
            <h2>Productivity Snapshot</h2>
            <span className="pill graphitePill">At a glance</span>
          </div>
          <div className="snapshotGrid">
            <div className="snapshotCard">
              <p className="snapshotLabel">Total notes</p>
              <p className="snapshotValue">{notes.length}</p>
            </div>
            <div className="snapshotCard">
              <p className="snapshotLabel">Pending reminders</p>
              <p className="snapshotValue">{pendingReminders.length}</p>
            </div>
            <div className="snapshotCard">
              <p className="snapshotLabel">Today agenda</p>
              <p className="snapshotValue">{todayAgenda.length}</p>
            </div>
          </div>
          <h3 className="subheading">Recent notes</h3>
          <ul className="list">
            {recentNotes.length ? recentNotes.map((n) => (
              <li key={n.id}>{n.title} - {n.content || "No content"}</li>
            )) : <li className="muted">No notes yet.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="titleRow">
            <h2>Calendar</h2>
            <div className="miniActions">
              <button type="button" className="ghostButton" aria-label="Show previous month" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>Prev</button>
              <button type="button" className="ghostButton" aria-label="Jump to current month" onClick={() => setCalendarCursor(new Date())}>Today</button>
              <button type="button" className="ghostButton" aria-label="Show next month" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>Next</button>
            </div>
          </div>
          <p className="muted">{selectedMonthLabel}</p>
          <div className="calendarGrid" role="grid" aria-label={`Reminders calendar for ${selectedMonthLabel}`} onKeyDown={handleCalendarGridKeyDown}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendarHeader" role="columnheader">{d}</div>
            ))}
            {monthCells.map((cell, idx) => (
              <button
                type="button"
                key={`${cell.dateKey}-${idx}`}
                className={`calendarCell calendarCellButton ${cell.isCurrentMonth ? "" : "calendarCellMuted"} ${cell.dateKey === todayKey ? "calendarCellToday" : ""} ${cell.dateKey === selectedDateKey ? "calendarCellSelected" : ""}`}
                role="gridcell"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                onFocus={() => {
                  if (cell.dateKey !== selectedDateKey) {
                    setSelectedDateKey(cell.dateKey);
                  }
                }}
                aria-label={`${
                  formatDateLabel(cell.dateKey)
                } in ${selectedMonthLabel}${cell.count ? `, ${cell.count} pending reminder${cell.count === 1 ? "" : "s"}` : ", no pending reminders"}`}
                aria-pressed={cell.dateKey === selectedDateKey}
                aria-current={cell.dateKey === todayKey ? "date" : undefined}
                tabIndex={idx === selectedDateIndex || (selectedDateIndex === -1 && idx === 0) ? 0 : -1}
              >
                <div className="calendarCellTop">
                  <span>{cell.dayNumber}</span>
                  {cell.count ? <span className="calendarBadge">{cell.count}</span> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="titleRow dayFocusTitle">
            <h3 className="subheading">Day focus: {selectedDateLabel}</h3>
            <div className="miniActions">
              <button type="button" className="ghostButton" onClick={() => setSelectedDateKey(todayKey)}>Jump to today</button>
            </div>
          </div>
          {selectedDayReminders.some((r) => r.status === "pending") ? (
            <div className="miniActions dayBatchActions">
              <button
                className="ghostButton"
                onClick={async () => {
                  const pendingIds = selectedDayReminders.filter((r) => r.status === "pending").map((r) => r.id);
                  try {
                    await Promise.all(pendingIds.map((id) => window.assistantApi.snoozeReminder(id, 60)));
                    setStatus(`Snoozed ${pendingIds.length} reminder(s) by 1 hour.`);
                    await refreshReminders();
                  } catch (err) {
                    setError(getErrorMessage(err));
                  }
                }}
              >
                Snooze all pending 1h
              </button>
              <button
                className="ghostButton"
                onClick={async () => {
                  const pendingIds = selectedDayReminders.filter((r) => r.status === "pending").map((r) => r.id);
                  try {
                    await Promise.all(pendingIds.map((id) => window.assistantApi.completeReminder(id)));
                    setStatus(`Marked ${pendingIds.length} reminder(s) as done.`);
                    await refreshReminders();
                  } catch (err) {
                    setError(getErrorMessage(err));
                  }
                }}
              >
                Mark all done
              </button>
            </div>
          ) : null}
          <ul className="list">
            {selectedDayReminders.length ? selectedDayReminders.map((r) => (
              <li key={r.id} className="listRow">
                <span>
                  {new Date(r.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {r.text} ({r.status})
                  {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? (
                    <strong className="overdueBadge">Overdue {formatOverdueForHumans(r.dueAt)}</strong>
                  ) : null}
                </span>
                {r.status === "pending" ? (
                  <div className="miniActions">
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await completeReminderWithFeedback(r.id, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Mark done
                    </button>
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await snoozeReminderWithFeedback(r.id, 60, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Snooze 1h
                    </button>
                    <button
                      className="dangerButton"
                      onClick={async () => {
                        if (!window.confirm("Delete this reminder?")) return;
                        try {
                          await deleteReminderWithFeedback(r.id);
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            )) : <li className="muted">No reminders on this day.</li>}
          </ul>
          <h3 className="subheading">Today agenda</h3>
          <ul className="list">
            {todayAgenda.length ? todayAgenda.map((r) => (
              <li key={r.id}>{new Date(r.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {r.text}</li>
            )) : <li className="muted">No pending reminders today.</li>}
          </ul>
        </section>
      </div>
      </details> : null}

      {activeSection === "productivity" ? <div className="grid">
        <section className="panel">
          <div className="titleRow">
            <h2>Quick Note</h2>
            <span className="pill graphitePill">Capture</span>
          </div>
          <p className="muted sectionIntro">Capture thoughts quickly and keep your recent notes in view.</p>
          <QuickNoteForm
            titleInputRef={quickNoteTitleRef}
            onDone={refreshAll}
            onError={handleFormError}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading notes...</li> : notes.length ? visibleNotesSlice.map((n) => (
              <li key={n.id} className="listRow">
                <span>{n.title} - {n.content}</span>
                <button
                  className="dangerButton"
                  onClick={async () => {
                    if (!window.confirm(`Delete note "${n.title}"?`)) return;
                    try {
                      await window.assistantApi.deleteNote(n.id);
                      setStatus("Note deleted.");
                      await refreshAll();
                    } catch (err) {
                      setError(getErrorMessage(err));
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            )) : <li className="muted">No notes yet.</li>}
          </ul>
          {notes.length > notesVisible ? (
            <button className="ghostButton" onClick={() => setNotesVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more notes
            </button>
          ) : null}
        </section>

        <section className="panel">
          <div className="titleRow">
            <h2>Reminders</h2>
            <span className="pill graphitePill">Showing: {reminderFilter}</span>
          </div>
          <p className="muted sectionIntro">Schedule quickly and switch views in one click.</p>
          <div className="row reminderFilterRow" role="group" aria-label="Reminder filter">
            <button
              type="button"
              className={`ghostButton ${reminderFilter === "pending" ? "filterButtonActive" : ""}`}
              onClick={() => setReminderFilterWithVisibilityReset("pending")}
            >
              Pending ({pendingReminders.length})
            </button>
            <button
              type="button"
              className={`ghostButton ${reminderFilter === "all" ? "filterButtonActive" : ""}`}
              onClick={() => setReminderFilterWithVisibilityReset("all")}
            >
              All ({reminders.length})
            </button>
            <button
              type="button"
              className={`ghostButton ${reminderFilter === "done" ? "filterButtonActive" : ""}`}
              onClick={() => setReminderFilterWithVisibilityReset("done")}
            >
              Done ({doneRemindersCount})
            </button>
          </div>
          <ReminderForm
            onDone={refreshReminders}
            onError={handleFormError}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading reminders...</li> : visibleReminders.length ? visibleRemindersSlice.map((r) => (
              <li key={r.id} className="listRow">
                <span>
                  {r.text} - {new Date(r.dueAt).toLocaleString()}
                  {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? (
                    <strong className="overdueBadge">Overdue {formatOverdueForHumans(r.dueAt)}</strong>
                  ) : null}
                  {r.status === "done" ? <span className="muted"> (done)</span> : null}
                </span>
                {r.status === "pending" ? (
                  <div className="miniActions">
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await completeReminderWithFeedback(r.id, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Mark done
                    </button>
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await snoozeReminderWithFeedback(r.id, 15, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      +15m
                    </button>
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await snoozeReminderWithFeedback(r.id, 60, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Snooze 1h
                    </button>
                    <button
                      className="dangerButton"
                      onClick={async () => {
                        if (!window.confirm("Delete this reminder?")) return;
                        try {
                          await deleteReminderWithFeedback(r.id, { quiet: true });
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            )) : <li className="muted">No reminders for this filter.</li>}
          </ul>
          {visibleReminders.length > remindersVisible ? (
            <button className="ghostButton" onClick={() => setRemindersVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more reminders
            </button>
          ) : null}
        </section>
      </div> : null}

      {activeSection === "integrations" ? <section className="panel" id={getSectionPanelId("integrations")} role="tabpanel" aria-labelledby={getSectionButtonId("integrations")}>
        <div className="titleRow">
          <h2>Home Assistant</h2>
          <span className={`pill ${haSetupState === "ready" ? "" : "graphitePill"}`}>{haReadinessLabel}</span>
        </div>
        <p className="muted sectionIntro">{haReadinessHint}</p>
        <p className="muted">{haSetupChecklist.join(" ")}</p>
        <div className="row">
          <label className="srOnly" htmlFor="ha-url-input">Home Assistant URL</label>
          <input
            id="ha-url-input"
            ref={haUrlInputRef}
            placeholder="http://homeassistant.local:8123"
            value={haUrl}
            onChange={(e) => setHaUrl(e.target.value)}
          />
          <label className="srOnly" htmlFor="ha-token-input">Home Assistant token</label>
          <input
            id="ha-token-input"
            placeholder="Long-lived access token"
            type="password"
            autoComplete="new-password"
            value={haToken}
            onChange={(e) => setHaToken(e.target.value)}
          />
        </div>
        <div className="row">
          <button
            disabled={isSavingHa || !canSaveHaConfig}
            onClick={async () => {
              try {
                setError("");
                setIsSavingHa(true);
                await window.assistantApi.configureHomeAssistant({ url: haUrl, token: haToken });
                const config = await window.assistantApi.getHomeAssistantConfig();
                setHasHaToken(config.hasToken);
                setHaToken("");
                setStatus("Home Assistant setup saved. Next: Test connection, then Refresh entities.");
              } catch (err) {
                setError(getHaErrorMessage(err, "saving setup", hasHaToken));
              } finally {
                setIsSavingHa(false);
              }
            }}
          >
            {isSavingHa ? "Saving..." : haPrimaryActionLabel}
          </button>
          <button
            disabled={!haReady}
            onClick={async () => {
              try {
                setError("");
                const connected = await window.assistantApi.testHomeAssistant();
                if (connected) {
                  setStatus("Home Assistant connected. Next: Refresh entities to sync devices.");
                } else {
                  setError("Connection test failed. Confirm URL and token, then retry Test connection.");
                }
              } catch (err) {
                setError(getHaErrorMessage(err, "testing connection", hasHaToken));
              }
            }}
          >
            Test connection
          </button>
          <button
            disabled={isRefreshingHa || !haReady}
            onClick={async () => {
              try {
                setError("");
                setIsRefreshingHa(true);
                await window.assistantApi.refreshHomeAssistantEntities();
                await refreshDevices();
                setStatus("Entities refreshed. Device list is now up to date.");
              } catch (err) {
                setError(getHaErrorMessage(err, "refreshing entities", hasHaToken));
              } finally {
                setIsRefreshingHa(false);
              }
            }}
          >
            {isRefreshingHa ? "Refreshing..." : "Refresh entities"}
          </button>
        </div>
        {!canSaveHaConfig ? <p className="muted">Enter URL and token, then click Save setup.</p> : null}
        {haReady && !devices.length ? <p className="muted">Connected but no devices yet? Run Refresh entities and check that lights/switches exist in Home Assistant.</p> : null}
        <details className="collapsibleGroup">
          <summary className="collapsibleSummary muted">Connection troubleshooting</summary>
          <ul className="list compactList">
            <li>Use full URL format, for example `http://homeassistant.local:8123`.</li>
            <li>Create a long-lived access token in Home Assistant profile settings.</li>
            <li>401/403 errors usually mean token issue or missing token permissions.</li>
            <li>If connection passes but devices are empty, run Refresh entities.</li>
            <li>If URL/token changed, click Save setup again before re-testing.</li>
          </ul>
        </details>
        <details className="collapsibleGroup">
          <summary className="collapsibleSummary muted">Devices ({devices.length})</summary>
          <ul className="list">
          {isRefreshing ? <li className="muted">Loading devices...</li> : devices.length ? visibleDevicesSlice.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>{d.friendlyName} ({d.state})</span>
              <button
                className="ghostButton"
                onClick={async () => {
                  try {
                    setError("");
                    const confirmed = window.confirm(
                      `Toggle "${d.friendlyName}" (${d.entityId})? Current state: ${d.state}.`
                    );
                    if (!confirmed) return;
                    await window.assistantApi.toggleDevice(d.entityId);
                    setStatus(`Toggled ${d.friendlyName}.`);
                    await refreshDevices();
                  } catch (err) {
                    setError(getHaErrorMessage(err, "toggling device", hasHaToken));
                  }
                }}
              >
                Toggle
              </button>
            </li>
          )) : <li className="muted">No synced devices yet. Save credentials and refresh entities.</li>}
          </ul>
          {devices.length > devicesVisible ? (
            <button className="ghostButton" onClick={() => setDevicesVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more devices
            </button>
          ) : null}
        </details>
      </section> : null}

      {activeSection === "automation" ? <div className="grid" id={getSectionPanelId("automation")} role="tabpanel" aria-labelledby={getSectionButtonId("automation")}>
        <section className="panel">
          <div className="titleRow">
            <h2>Rules</h2>
            <span className="pill graphitePill">Schedule</span>
          </div>
          <RuleForm
            nameInputRef={ruleNameInputRef}
            devices={devices}
            onDone={refreshAll}
            onError={handleFormError}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading rules...</li> : rules.length ? visibleRulesSlice.map((r) => (
              <li key={r.id}>
                <strong>{r.name}</strong> - {r.triggerConfig.at} - {formatAutomationActionLabel(r.actionType, r.actionConfig)}
              </li>
            )) : <li className="muted">No rules yet.</li>}
          </ul>
          {rules.length > rulesVisible ? (
            <button className="ghostButton" onClick={() => setRulesVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more rules
            </button>
          ) : null}
        </section>

        <details className="panel collapsibleGroup">
          <summary className="titleRow collapsibleSummary">
            <h2>Logs</h2>
            <span className="pill graphitePill">Runs</span>
          </summary>
          <div className="snapshotGrid">
            <div className="snapshotCard">
              <p className="snapshotLabel">Recent runs</p>
              <p className="snapshotValue">{logs.length}</p>
            </div>
            <div className="snapshotCard">
              <p className="snapshotLabel">Success</p>
              <p className="snapshotValue">{successfulLogsCount}</p>
            </div>
            <div className="snapshotCard">
              <p className="snapshotLabel">Failed</p>
              <p className="snapshotValue">{failedLogsCount}</p>
            </div>
          </div>
          <div className="row reminderFilterRow">
            <button
              type="button"
              className={`ghostButton ${logFilter === "all" ? "filterButtonActive" : ""}`}
              onClick={() => {
                setLogsVisible(INITIAL_VISIBLE_ITEMS);
                setLogFilter("all");
              }}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              className={`ghostButton ${logFilter === "success" ? "filterButtonActive" : ""}`}
              onClick={() => {
                setLogsVisible(INITIAL_VISIBLE_ITEMS);
                setLogFilter("success");
              }}
            >
              Success ({successfulLogsCount})
            </button>
            <button
              type="button"
              className={`ghostButton ${logFilter === "failed" ? "filterButtonActive" : ""}`}
              onClick={() => {
                setLogsVisible(INITIAL_VISIBLE_ITEMS);
                setLogFilter("failed");
              }}
            >
              Failed ({failedLogsCount})
            </button>
          </div>
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading logs...</li> : filteredLogs.length ? visibleFilteredLogsSlice.map((l) => (
              <li key={l.id}>
                <strong>{l.status === "success" ? "Success" : "Failed"}</strong> - {l.ruleName} - {l.actionLabel} - {new Date(l.startedAt).toLocaleString()} ({formatElapsedLabel(l.startedAt, l.endedAt)}, {getAutomationMonitoringSignalLabel(l.status, l.error)})
                {l.error ? ` - ${l.error}` : ""}
              </li>
            )) : <li className="muted">No execution logs for this filter.</li>}
          </ul>
          {filteredLogs.length > logsVisible ? (
            <button className="ghostButton" onClick={() => setLogsVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more logs
            </button>
          ) : null}
        </details>
      </div> : null}
    </main>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getHaErrorMessage(err: unknown, operation: HaRecoveryContext, hasSavedToken: boolean): string {
  const raw = getErrorMessage(err);
  const lower = raw.toLowerCase();
  const sharedRecovery = hasSavedToken
    ? "Try Test connection again, then Refresh entities."
    : "Save URL and token first, then run Test connection.";
  const recoveryLabel = getHaRecoveryLabel(operation);
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return `Home Assistant ${operation} failed: token is invalid or expired. Next: create a new token, Save setup, then ${recoveryLabel}.`;
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return `Home Assistant ${operation} failed: token lacks required permissions. Next: update token scope, Save setup, then ${recoveryLabel}.`;
  }
  if (lower.includes("404")) {
    return `Home Assistant ${operation} failed: URL or endpoint was not found. Next: verify URL, Save setup, then ${recoveryLabel}.`;
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return `Home Assistant ${operation} timed out. Next: verify server is online, then retry.`;
  }
  if (lower.includes("not configured")) {
    return "Home Assistant is not configured yet. Next: add URL/token, Save setup, then run Test connection.";
  }
  if (lower.includes("request failed")) {
    return `Home Assistant ${operation} failed: cannot reach server. Next: check URL/network, then retry.`;
  }
  return `${raw} Next: ${sharedRecovery}`;
}

function getHaRecoveryLabel(operation: HaRecoveryContext): string {
  if (operation === "saving setup") return "run Test connection";
  if (operation === "testing connection") return "retry Test connection";
  if (operation === "refreshing entities") return "run Refresh entities";
  return "retry the action";
}

function formatAutomationActionLabel(actionType: "localReminder" | "haToggle", actionConfig: Record<string, string>): string {
  if (actionType === "localReminder") {
    return `Create reminder${actionConfig.text ? `: ${actionConfig.text}` : ""}`;
  }
  return `Toggle device${actionConfig.entityId ? `: ${actionConfig.entityId}` : ""}`;
}

function formatElapsedLabel(startedAt: string, endedAt: string): string {
  const elapsedMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return "<1s";
  const seconds = Math.floor(elapsedMs / 1000);
  return seconds > 0 ? `${seconds}s` : "<1s";
}

function getAutomationMonitoringSignalLabel(status: string, error?: string): string {
  if (status === "failed") {
    if (!error) return "action failed";
    const lower = error.toLowerCase();
    if (lower.includes("timeout")) return "needs timeout tuning";
    if (lower.includes("not configured")) return "setup required";
    if (lower.includes("unsupported")) return "rule config issue";
    return "needs review";
  }
  if (!error) return "healthy";
  const lower = error.toLowerCase();
  if (lower.includes("retry")) return "recovered after retry";
  if (lower.includes("timeout")) return "slow but recovered";
  return "healthy";
}

function parseReminderCommand(bodyRaw: string): { text: string; dueAt: string } {
  const body = bodyRaw.trim();
  if (!body) {
    throw new Error(
      "Use: remind <text> in <number><m|h>, remind <text> at HH:MM, or remind <text> tomorrow at HH:MM."
    );
  }
  const tomorrowMatch = body.match(/^(.*)\s+tomorrow\s+at\s+(.+)$/i);
  if (tomorrowMatch) {
    const text = tomorrowMatch[1].trim();
    const parsedTime = parseClockTime(tomorrowMatch[2]);
    if (!text) throw new Error("Reminder text is required.");
    if (!parsedTime) {
      throw new Error("Use a valid time in 24h format, for example: remind check backup tomorrow at 09:00");
    }
    const due = new Date();
    due.setDate(due.getDate() + 1);
    due.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    return { text, dueAt: due.toISOString() };
  }

  const match = body.match(/^(.*)\s+in\s+(\d+)\s*(m|mins?|minutes?|h|hrs?|hours?)$/i);
  if (match) {
    const text = match[1].trim();
    const amount = Number(match[2]);
    const unit = match[3].toLowerCase();
    const minutes = unit.startsWith("h") ? amount * 60 : amount;
    if (!text) throw new Error("Reminder text is required.");
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Reminder time must be positive.");
    return { text, dueAt: new Date(Date.now() + minutes * 60_000).toISOString() };
  }

  const atMatch = body.match(/^(.*)\s+at\s+(.+)$/i);
  if (atMatch) {
    const text = atMatch[1].trim();
    const parsedTime = parseClockTime(atMatch[2]);
    if (!text) throw new Error("Reminder text is required.");
    if (!parsedTime) {
      throw new Error("Use a valid time in 24h format, for example: remind send report at 16:30");
    }
    const due = new Date();
    due.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    if (due.getTime() <= Date.now()) {
      due.setDate(due.getDate() + 1);
    }
    return { text, dueAt: due.toISOString() };
  }

  throw new Error(
    "Use: remind <text> in <number><m|h>, remind <text> at HH:MM, or remind <text> tomorrow at HH:MM."
  );
}

function normalizeCommandAlias(input: string): string {
  const normalized = input
    .trim()
    .replace(/^(hey|hi)\s+assistant[:,]?\s*/i, "")
    .replace(/^assistant[:,]?\s*/i, "")
    .replace(/[.!?]+$/g, "");
  const lower = normalized.toLowerCase();
  if (lower === "today" || lower === "what's next" || lower === "whats next") {
    return "list reminders";
  }
  if (lower === "commands" || lower === "?" || lower === "what can you do") return "help";
  if (lower === "all reminders") return "show all reminders";
  if (lower === "show reminders" || lower === "show pending reminders") return "list reminders";
  if (lower === "overdue") return "show overdue";
  if (lower === "sync") return "refresh";
  if (lower === "sync devices") return "refresh devices";
  return normalized;
}

function parseCommandInput(rawInput: string): ParsedCommand {
  const normalizedInput = normalizeCommandAlias(rawInput).replace(/\s+/g, " ").trim();
  const lower = normalizedInput.toLowerCase();
  if (lower === "help") return { intent: "help", normalizedInput };
  if (lower === "list reminders" || lower === "list reminder") return { intent: "listPendingReminders", normalizedInput };
  if (lower === "show all reminders") return { intent: "showAllReminders", normalizedInput };
  if (lower === "show overdue") return { intent: "showOverdue", normalizedInput };
  if (lower === "clear search") return { intent: "clearSearch", normalizedInput };
  if (lower === "refresh" || lower === "sync now") return { intent: "refreshAll", normalizedInput };
  if (lower === "refresh devices") return { intent: "refreshDevices", normalizedInput };
  if (lower === "new note" || lower === "note") {
    throw new Error("Write note text after 'new note'. Example: new note buy coffee.");
  }
  if (lower === "remind") {
    throw new Error("Use a reminder command like: remind call mom in 15m");
  }
  if (lower === "search") {
    throw new Error("Write a search term after 'search'.");
  }
  if (lower === "toggle") {
    throw new Error("Specify what to toggle. Example: toggle kitchen light.");
  }
  if (lower.startsWith("search ")) return { intent: "searchNotes", args: normalizedInput.slice(7).trim(), normalizedInput };
  if (lower.startsWith("new note ")) return { intent: "createNote", args: normalizedInput.slice(9).trim(), normalizedInput };
  if (lower.startsWith("note ")) return { intent: "createNote", args: normalizedInput.slice(5).trim(), normalizedInput };
  if (lower.startsWith("remind ")) return { intent: "createReminder", args: normalizedInput.slice(7).trim(), normalizedInput };
  if (lower.startsWith("toggle ")) return { intent: "toggleDevice", args: normalizedInput.slice(7).trim(), normalizedInput };
  return { intent: "unknown", normalizedInput };
}

function buildCommandHelpMessage(): string {
  return [
    "Commands:",
    "new note <text>",
    "remind <text> in <number><m|h|min|hr>",
    "remind <text> at HH:MM or H:MMam/pm",
    "search <term>",
    "list reminders | show all reminders | show overdue",
    "toggle <device> | refresh | refresh devices"
  ].join("  ");
}

function parseClockTime(rawTime: string): { hours: number; minutes: number } | null {
  const match = rawTime.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "am") {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }
  return { hours, minutes };
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date | null {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function buildCalendarCells(monthDate: Date, remindersByDate: Map<string, Reminder[]>): Array<{ dateKey: string; dayNumber: number; isCurrentMonth: boolean; count: number }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = firstDay.getDay();
  const cells: Array<{ dateKey: string; dayNumber: number; isCurrentMonth: boolean; count: number }> = [];

  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(year, month, 1 - i);
    const key = toLocalDateKey(date);
    cells.push({ dateKey: key, dayNumber: date.getDate(), isCurrentMonth: false, count: (remindersByDate.get(key) || []).length });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = toLocalDateKey(date);
    cells.push({ dateKey: key, dayNumber: day, isCurrentMonth: true, count: (remindersByDate.get(key) || []).length });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const nextDate = new Date(year, month + 1, trailingDay);
    const key = toLocalDateKey(nextDate);
    cells.push({ dateKey: key, dayNumber: nextDate.getDate(), isCurrentMonth: false, count: (remindersByDate.get(key) || []).length });
    trailingDay += 1;
  }

  return cells;
}

const RuleForm = memo(function RuleForm({
  nameInputRef,
  devices,
  onDone,
  onError
}: {
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  devices: Array<{ entityId: string; friendlyName: string; state: string }>;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}): JSX.Element {
  const [name, setName] = useState("Morning check");
  const [at, setAt] = useState("08:00");
  const [actionType, setActionType] = useState<"localReminder" | "haToggle">("localReminder");
  const [text, setText] = useState("Check your agenda");
  const [entityId, setEntityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submitRule(): Promise<void> {
    try {
      setIsSubmitting(true);
      if (!name.trim()) throw new Error("Rule name is required.");
      if (!at) throw new Error("Choose a time for this rule.");
      if (actionType === "localReminder" && !text.trim()) throw new Error("Reminder text is required for reminder actions.");
      if (actionType === "haToggle" && !entityId) throw new Error("Select a device for haToggle actions.");
      await window.assistantApi.createRule({
        name: name.trim(),
        triggerConfig: { at },
        actionType,
        actionConfig: actionType === "localReminder" ? { text: text.trim() } : { entityId },
        enabled: true
      });
      setName("Morning check");
      setAt("08:00");
      setText("Check your agenda");
      setEntityId("");
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="row" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) void submitRule(); }}>
      <label className="srOnly" htmlFor="rule-name-input">Rule name</label>
      <input id="rule-name-input" ref={nameInputRef as React.Ref<HTMLInputElement>} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <label className="srOnly" htmlFor="rule-time-input">Rule time</label>
      <input id="rule-time-input" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <label className="srOnly" htmlFor="rule-action-type-select">Rule action type</label>
      <select id="rule-action-type-select" value={actionType} onChange={(e) => setActionType(e.target.value as "localReminder" | "haToggle")}>
        <option value="localReminder">Create reminder</option>
        <option value="haToggle">Toggle device</option>
      </select>
      {actionType === "localReminder" ? (
        <>
          <label className="srOnly" htmlFor="rule-reminder-text-input">Reminder text to create</label>
          <input id="rule-reminder-text-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reminder text to create" />
        </>
      ) : (
        <>
          <label className="srOnly" htmlFor="rule-device-select">Device for toggle action</label>
          <select id="rule-device-select" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="">Select device</option>
            {devices.map((d) => <option key={d.entityId} value={d.entityId}>{d.friendlyName}</option>)}
          </select>
        </>
      )}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add Rule"}
      </button>
    </form>
  );
});

const QuickNoteForm = memo(function QuickNoteForm({
  titleInputRef,
  onDone,
  onError
}: {
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submitNote(): Promise<void> {
    try {
      setIsSubmitting(true);
      if (!title.trim() && !content.trim()) throw new Error("Write a title or content before adding a note.");
      await window.assistantApi.createNote({ title: title.trim() || "Untitled", content: content.trim(), tags: [], pinned: false });
      setTitle("");
      setContent("");
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="row" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) void submitNote(); }}>
      <label className="srOnly" htmlFor="quick-note-title-input">Note title</label>
      <input id="quick-note-title-input" ref={titleInputRef as React.Ref<HTMLInputElement>} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="srOnly" htmlFor="quick-note-content-input">Note content</label>
      <input id="quick-note-content-input" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add"}
      </button>
    </form>
  );
});

const ReminderForm = memo(function ReminderForm({
  onDone,
  onError
}: {
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
  const [quickMinutes, setQuickMinutes] = useState("15");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const applyQuickMinutes = useCallback((minutes: number) => {
    setDueAt(toLocalDateTimeInputValue(new Date(Date.now() + minutes * 60_000)));
  }, []);
  const applyTomorrowAt = useCallback((hours: number, minutes: number) => {
    const due = new Date();
    due.setDate(due.getDate() + 1);
    due.setHours(hours, minutes, 0, 0);
    setDueAt(toLocalDateTimeInputValue(due));
  }, []);
  async function submitReminder(): Promise<void> {
    try {
      setIsSubmitting(true);
      if (!text.trim()) throw new Error("Reminder text is required.");
      const parsedDueAt = parseLocalDateTimeInput(dueAt);
      if (new Date(parsedDueAt).getTime() <= Date.now()) {
        throw new Error("Reminder time must be in the future.");
      }
      await window.assistantApi.createReminder({ text: text.trim(), dueAt: parsedDueAt, recurrence: "none" });
      setText("");
      setDueAt(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="row" onSubmit={(event) => { event.preventDefault(); if (!isSubmitting) void submitReminder(); }}>
      <label className="srOnly" htmlFor="reminder-text-input">Reminder text</label>
      <input id="reminder-text-input" placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <label className="srOnly" htmlFor="reminder-date-input">Reminder date and time</label>
      <input
        id="reminder-date-input"
        type="datetime-local"
        value={dueAt}
        min={toLocalDateTimeInputValue(new Date())}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Scheduling..." : "Schedule"}
      </button>
      <div className="reminderQuickRow" role="group" aria-label="Reminder quick time presets">
        <button type="button" className="ghostButton" onClick={() => applyQuickMinutes(15)}>+15m</button>
        <button type="button" className="ghostButton" onClick={() => applyQuickMinutes(30)}>+30m</button>
        <button type="button" className="ghostButton" onClick={() => applyQuickMinutes(60)}>+1h</button>
        <button type="button" className="ghostButton" onClick={() => applyTomorrowAt(9, 0)}>Tomorrow 09:00</button>
        <input
          type="number"
          min={1}
          max={1440}
          step={1}
          value={quickMinutes}
          onChange={(event) => setQuickMinutes(event.target.value)}
          className="quickMinutesInput"
          aria-label="Custom quick minutes"
        />
        <button
          type="button"
          className="ghostButton"
          onClick={() => {
            const parsed = Number(quickMinutes);
            if (Number.isFinite(parsed) && parsed > 0) {
              applyQuickMinutes(Math.min(1440, Math.floor(parsed)));
            }
          }}
        >
          Apply minutes
        </button>
      </div>
    </form>
  );
});

function toLocalDateTimeInputValue(date: Date): string {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function parseLocalDateTimeInput(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Pick a valid date and time for the reminder.");
  }
  return parsed.toISOString();
}

function formatOverdueForHumans(dueAtIso: string): string {
  const dueAt = new Date(dueAtIso).getTime();
  if (!Number.isFinite(dueAt)) return "";
  const diffMs = Date.now() - dueAt;
  if (diffMs <= 0) return "";
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatSnoozeLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} minutes`;
}
