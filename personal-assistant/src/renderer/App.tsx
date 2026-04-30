import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note, Reminder } from "../shared/types";

type ThemeMode = "light" | "dark";

const INITIAL_VISIBLE_ITEMS = 30;
const VISIBLE_ITEMS_STEP = 30;
type WorkspaceSection = "dashboard" | "productivity" | "integrations" | "automation";

export function App(): JSX.Element {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [hasHaToken, setHasHaToken] = useState(false);
  const [devices, setDevices] = useState<Array<{ entityId: string; friendlyName: string; state: string }>>([]);
  const [logs, setLogs] = useState<Array<{ id: string; status: string; startedAt: string; error?: string }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; name: string; triggerConfig: { at: string }; actionType: string }>>([]);
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
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem("assistant-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("dashboard");
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const latestRefreshRef = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !window.localStorage.getItem("assistant-onboarded"));

  const refreshNotes = useCallback(async (searchTerm = query): Promise<void> => {
    const nextNotes = await window.assistantApi.listNotes(searchTerm);
    setNotes(nextNotes);
  }, [query]);

  const refreshReminders = useCallback(async (): Promise<void> => {
    const nextReminders = await window.assistantApi.listReminders();
    setReminders(nextReminders);
  }, []);

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
        window.assistantApi.listNotes(query),
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
        if (config.hasToken) setStatus("Stored Home Assistant token detected.");
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
      setStatus(`Tray command: ${command}`);
    });
    return off;
  }, []);

  useEffect(() => {
    if (activeSection === "dashboard") {
      commandInputRef.current?.focus();
    }
  }, [activeSection]);

  useEffect(() => {
    setNotesVisible(INITIAL_VISIBLE_ITEMS);
  }, [query]);

  useEffect(() => {
    setRemindersVisible(INITIAL_VISIBLE_ITEMS);
  }, [reminderFilter]);

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

  const commandHints = useMemo(
    () => [
      "new note Buy milk",
      "remind Call mom in 15m",
      "search groceries",
      "list reminders",
      "toggle kitchen light"
    ]
      .filter((c) => c.toLowerCase().includes(commandInput.toLowerCase()))
      .slice(0, 3),
    [commandInput]
  );
  const pendingReminders = useMemo(() => reminders.filter((r) => r.status === "pending"), [reminders]);
  const overdueReminders = useMemo(
    () => pendingReminders.filter((r) => new Date(r.dueAt).getTime() < Date.now()),
    [pendingReminders]
  );
  const visibleReminders = useMemo(
    () => reminders.filter((r) => reminderFilter === "all" || r.status === reminderFilter),
    [reminders, reminderFilter]
  );
  const haReady = Boolean(haUrl.trim() && (hasHaToken || haToken.trim()));
  const canSaveHaConfig = Boolean(haUrl.trim() && (hasHaToken || haToken.trim()));
  const remindersByDate = useMemo(() => {
    const byDate = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
      const key = toLocalDateKey(new Date(reminder.dueAt));
      byDate.set(key, [...(byDate.get(key) || []), reminder]);
    }
    return byDate;
  }, [reminders]);
  const monthCells = useMemo(() => buildCalendarCells(calendarCursor, remindersByDate), [calendarCursor, remindersByDate]);
  const todayKey = toLocalDateKey(new Date());
  const todayAgenda = useMemo(
    () =>
      reminders
        .filter((r) => r.status === "pending" && toLocalDateKey(new Date(r.dueAt)) === todayKey)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [reminders, todayKey]
  );
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);
  const visibleNotesSlice = useMemo(() => notes.slice(0, notesVisible), [notes, notesVisible]);
  const visibleRemindersSlice = useMemo(
    () => visibleReminders.slice(0, remindersVisible),
    [visibleReminders, remindersVisible]
  );
  const visibleDevicesSlice = useMemo(() => devices.slice(0, devicesVisible), [devices, devicesVisible]);
  const visibleRulesSlice = useMemo(() => rules.slice(0, rulesVisible), [rules, rulesVisible]);
  const visibleLogsSlice = useMemo(() => logs.slice(0, logsVisible), [logs, logsVisible]);

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
      const normalized = normalizeCommandAlias(raw);
      const lower = normalized.toLowerCase();

      if (lower === "help") {
        setStatus("Try: new note <text>, remind <text> in 15m, search <term>, list reminders, toggle <device>, refresh devices.");
      } else if (lower === "list reminders") {
        setReminderFilter("pending");
        setStatus("Showing pending reminders.");
      } else if (lower === "show all reminders") {
        setReminderFilter("all");
        setStatus("Showing all reminders.");
      } else if (lower === "show overdue") {
        setReminderFilter("pending");
        setStatus("Showing pending reminders. Overdue items are marked.");
      } else if (lower.startsWith("search ")) {
        const term = normalized.slice(7).trim();
        if (!term) throw new Error("Write a search term after 'search'.");
        setQuery(term);
        setStatus(`Searching notes for "${term}".`);
      } else if (lower === "clear search") {
        setQuery("");
        setStatus("Cleared note search.");
      } else if (lower.startsWith("new note ") || lower.startsWith("note ")) {
        const text = normalized.replace(/^new note\s+/i, "").replace(/^note\s+/i, "").trim();
        if (!text) throw new Error("Write note text after 'new note'.");
        await window.assistantApi.createNote({ title: text.slice(0, 40), content: text, tags: [], pinned: false });
        setStatus("Note created from command.");
      } else if (lower === "new note" || lower === "note") {
        throw new Error("Write note text after 'new note'. Example: new note buy coffee.");
      } else if (lower.startsWith("remind ")) {
        const parsed = parseReminderCommand(normalized);
        await window.assistantApi.createReminder({ text: parsed.text, dueAt: parsed.dueAt, recurrence: "none" });
        setStatus(`Reminder scheduled for ${new Date(parsed.dueAt).toLocaleString()}.`);
      } else if (lower === "remind") {
        throw new Error("Use a reminder command like: remind call mom in 15m");
      } else if (lower.startsWith("toggle ")) {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        const target = normalized.slice(7).trim().toLowerCase();
        if (!target) {
          throw new Error("Specify what to toggle. Example: toggle kitchen light.");
        }
        const device = devices.find((d) =>
          d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
        );
        if (!device) {
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
        await window.assistantApi.toggleDevice(device.entityId);
        setStatus(`Toggled ${device.friendlyName}.`);
      } else if (lower === "refresh" || lower === "sync now") {
        await refreshAll();
        setStatus("Assistant data refreshed.");
      } else if (lower === "refresh devices") {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        await window.assistantApi.refreshHomeAssistantEntities();
        await refreshDevices();
        setStatus("Home Assistant devices refreshed.");
      } else {
        throw new Error("Unknown command. Type 'help' to see supported commands.");
      }

      setCommandInput("");
      await refreshAll();
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
          <p className="eyebrow">Assistant workspace</p>
          <h1>Personal Assistant</h1>
          <p className="subtitle">Windows tray companion for notes, reminders, and Home Assistant automations.</p>
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
          <span className="stat">Notes: {notes.length}</span>
          <span className="stat">Devices: {devices.length}</span>
          <span className="stat">HA: {haReady ? "Ready" : "Setup needed"}</span>
        </div>
      </header>
      <nav className="topNav" aria-label="Workspace sections">
        <button
          className={`topNavButton ${activeSection === "dashboard" ? "topNavButtonActive" : ""}`}
          onClick={() => setActiveSection("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`topNavButton ${activeSection === "productivity" ? "topNavButtonActive" : ""}`}
          onClick={() => setActiveSection("productivity")}
        >
          Productivity
        </button>
        <button
          className={`topNavButton ${activeSection === "integrations" ? "topNavButtonActive" : ""}`}
          onClick={() => setActiveSection("integrations")}
        >
          Integrations
        </button>
        <button
          className={`topNavButton ${activeSection === "automation" ? "topNavButtonActive" : ""}`}
          onClick={() => setActiveSection("automation")}
        >
          Automation
        </button>
      </nav>
      <p className="muted sectionLabel">
        {activeSection === "dashboard"
          ? "Run commands and handle next actions."
          : activeSection === "productivity"
            ? "Review notes, reminders, and your agenda."
            : activeSection === "integrations"
              ? "Manage Home Assistant connection and devices."
              : "Create and monitor automations."}
      </p>

      {status ? <p className="status" role="status">Success: {status}</p> : null}
      {error ? <p className="error" role="alert">Error: {error}</p> : null}

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

      {activeSection === "dashboard" ? <section className="panel commandPanel">
        <div className="titleRow">
          <h2>Command Prompt</h2>
          <div className="assistantMeta">
            <span className="pill">Natural language</span>
            <span className="pill graphitePill">Assistant-first</span>
          </div>
        </div>
        <p className="assistantLead">Run one clear action at a time in plain English.</p>
        <p className="muted sectionIntro">Type a command, review suggestions, then press Enter to execute.</p>
        <div className="assistantContextRow">
          <span className="contextChip">Note search: {query || "none"}</span>
          <span className="contextChip">Reminder filter: {reminderFilter}</span>
          <span className="contextChip">HA: {haReady ? "connected" : "not connected"}</span>
        </div>
        <div className="row commandRow">
          <input
            ref={commandInputRef}
            className="fullWidth"
            placeholder="Type a command and press Enter..."
            value={commandInput}
            aria-label="Assistant command input"
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isRunningCommand) void runCommandInternal(commandInput);
            }}
          />
          <button className="commandAction" onClick={() => void runCommandInternal(commandInput)} disabled={isRunningCommand}>
            {isRunningCommand ? "Running..." : "Run"}
          </button>
        </div>
        <div className="row commandHintsRow">
          {commandHints.length ? commandHints.map((hint) => (
            <button key={hint} className="pillButton" onClick={() => setCommandInput(hint)}>{hint}</button>
          )) : <span className="muted">No matching command hints. Type <code>help</code> to see all commands.</span>}
        </div>
        <div className="assistantShortcutRow">
          <button className="ghostButton" onClick={() => setCommandInput("new note ")}>+ Note command</button>
          <button className="ghostButton" onClick={() => setCommandInput("remind  in 15m")}>+ Reminder command</button>
          <button className="ghostButton" onClick={() => setCommandInput("toggle ")}>+ Device command</button>
        </div>
        <p className="muted">
          Examples: <code>new note buy coffee</code>, <code>remind stand up in 10m</code>, <code>remind send report at 16:30</code>, <code>toggle bedroom</code>.
        </p>
        <div className="row commandHintsRow">
          <button className="ghostButton" onClick={() => runPresetCommand("help")}>Show commands</button>
          <button className="ghostButton" onClick={() => runPresetCommand("list reminders")}>Show pending reminders</button>
          <button className="ghostButton" onClick={() => setQuery("")}>Clear note search</button>
        </div>
        <p className="muted assistantTip">Tip: use <code>list reminders</code> after creating reminders to immediately focus on pending items.</p>
      </section> : null}

      {activeSection === "dashboard" ? <section className="panel">
        <div className="titleRow">
          <h2>Action Center</h2>
          <span className="pill graphitePill">Next best actions</span>
        </div>
        <p className="muted sectionIntro">Resolve blockers quickly with guided actions based on current assistant state.</p>
        <div className="assistantShortcutRow">
          {!haReady ? (
            <button className="ghostButton" onClick={() => setStatus("Add Home Assistant URL + token, then click Save and Refresh Entities.")}>
              Complete Home Assistant setup
            </button>
          ) : null}
          {overdueReminders.length ? (
            <button className="ghostButton" onClick={() => setReminderFilter("pending")}>
              Review overdue reminders ({overdueReminders.length})
            </button>
          ) : null}
          {!notes.length ? (
            <button className="ghostButton" onClick={() => runPresetCommand("new note plan tomorrow priorities")}>
              Create your first note
            </button>
          ) : null}
          <button className="ghostButton" onClick={() => void refreshAll()} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh assistant data"}
          </button>
        </div>
      </section> : null}

      {activeSection === "productivity" ? <div className="grid">
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
              <button className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>Prev</button>
              <button className="ghostButton" onClick={() => setCalendarCursor(new Date())}>Today</button>
              <button className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>Next</button>
            </div>
          </div>
          <p className="muted">{calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
          <div className="calendarGrid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendarHeader">{d}</div>
            ))}
            {monthCells.map((cell, idx) => (
              <div key={`${cell.dateKey}-${idx}`} className={`calendarCell ${cell.isCurrentMonth ? "" : "calendarCellMuted"} ${cell.dateKey === todayKey ? "calendarCellToday" : ""}`}>
                <div className="calendarCellTop">
                  <span>{cell.dayNumber}</span>
                  {cell.count ? <span className="calendarBadge">{cell.count}</span> : null}
                </div>
              </div>
            ))}
          </div>
          <h3 className="subheading">Today agenda</h3>
          <ul className="list">
            {todayAgenda.length ? todayAgenda.map((r) => (
              <li key={r.id}>{new Date(r.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {r.text}</li>
            )) : <li className="muted">No pending reminders today.</li>}
          </ul>
        </section>
      </div> : null}

      {activeSection === "productivity" ? <div className="grid">
        <section className="panel">
          <div className="titleRow">
            <h2>Quick Note</h2>
            <span className="pill graphitePill">Capture</span>
          </div>
          <p className="muted sectionIntro">Capture thoughts quickly and keep your recent notes in view.</p>
          <QuickNoteForm
            onDone={refreshAll}
            onError={(message) => setError(message)}
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
            <select value={reminderFilter} onChange={(e) => setReminderFilter(e.target.value as "all" | "pending" | "done")}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
            </select>
          </div>
          <p className="muted sectionIntro">Schedule tasks, then track pending and completed items.</p>
          <ReminderForm
            onDone={refreshAll}
            onError={(message) => setError(message)}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading reminders...</li> : visibleReminders.length ? visibleRemindersSlice.map((r) => (
              <li key={r.id} className="listRow">
                <span>
                  {r.text} ({r.status}) - {new Date(r.dueAt).toLocaleString()}
                  {r.status === "pending" && new Date(r.dueAt).getTime() < Date.now() ? <strong className="overdueBadge">Overdue</strong> : null}
                </span>
                {r.status === "pending" ? (
                  <div className="miniActions">
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await window.assistantApi.snoozeReminder(r.id, 10);
                          setStatus("Reminder snoozed by 10 minutes.");
                          await refreshAll();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Snooze 10m
                    </button>
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await window.assistantApi.snoozeReminder(r.id, 60);
                          setStatus("Reminder snoozed by 1 hour.");
                          await refreshAll();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Snooze 1h
                    </button>
                    <button
                      className="ghostButton"
                      onClick={async () => {
                        try {
                          await window.assistantApi.completeReminder(r.id);
                          setStatus("Reminder marked as done.");
                          await refreshAll();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Mark done
                    </button>
                    <button
                      className="dangerButton"
                      onClick={async () => {
                        if (!window.confirm("Delete this reminder?")) return;
                        try {
                          await window.assistantApi.deleteReminder(r.id);
                          setStatus("Reminder deleted.");
                          await refreshAll();
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

      {activeSection === "integrations" ? <section className="panel">
        <div className="titleRow">
          <h2>Home Assistant</h2>
          <span className="pill graphitePill">Smart home</span>
        </div>
        <p className="muted sectionIntro">Connect your Home Assistant instance to control synced entities.</p>
        <div className="row">
          <input
            placeholder="http://homeassistant.local:8123"
            value={haUrl}
            onChange={(e) => setHaUrl(e.target.value)}
          />
          <input
            placeholder="Long-lived access token"
            type="password"
            autoComplete="new-password"
            value={haToken}
            onChange={(e) => setHaToken(e.target.value)}
          />
        </div>
        <p className="muted">Status: {haReady ? "Ready to test and control devices." : "Enter URL and token, then Save."}</p>
        <p className="muted">If Save succeeds, you can leave token blank on future edits unless you want to replace it.</p>
        {!canSaveHaConfig ? <p className="muted">Save is enabled after you enter a URL and token.</p> : null}
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
                setStatus("Home Assistant config saved.");
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setIsSavingHa(false);
              }
            }}
          >
            {isSavingHa ? "Saving..." : "Save"}
          </button>
          <button
            disabled={!haReady}
            onClick={async () => {
              try {
                setError("");
                setStatus(
                  (await window.assistantApi.testHomeAssistant())
                    ? "Home Assistant connected."
                    : "Home Assistant test failed. Confirm URL, token, and API access."
                );
              } catch (err) {
                setError(getErrorMessage(err));
              }
            }}
          >
            Test
          </button>
          <button
            disabled={isRefreshingHa || !haReady}
            onClick={async () => {
              try {
                setError("");
                setIsRefreshingHa(true);
                await window.assistantApi.refreshHomeAssistantEntities();
                setStatus("Entities refreshed.");
                await refreshDevices();
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setIsRefreshingHa(false);
              }
            }}
          >
            {isRefreshingHa ? "Refreshing..." : "Refresh Entities"}
          </button>
        </div>
        <ul className="list">
          {isRefreshing ? <li className="muted">Loading devices...</li> : devices.length ? visibleDevicesSlice.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>{d.friendlyName} ({d.state})</span>
              <button
                className="ghostButton"
                onClick={async () => {
                  try {
                    setError("");
                    await window.assistantApi.toggleDevice(d.entityId);
                    await refreshDevices();
                  } catch (err) {
                    setError(getErrorMessage(err));
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
      </section> : null}

      {activeSection === "automation" ? <div className="grid">
        <section className="panel">
          <div className="titleRow">
            <h2>Automation Rules</h2>
            <span className="pill graphitePill">Automate</span>
          </div>
          <p className="muted sectionIntro">Set a daily time to create a reminder or toggle a Home Assistant device.</p>
          <RuleForm
            devices={devices}
            onDone={refreshAll}
            onError={(message) => setError(message)}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading rules...</li> : rules.length ? visibleRulesSlice.map((r) => (
              <li key={r.id}>
                {r.name} at {r.triggerConfig.at} {"->"} {r.actionType === "haToggle" ? "Toggle Home Assistant entity" : "Create local reminder"}
              </li>
            )) : <li className="muted">No rules yet.</li>}
          </ul>
          {rules.length > rulesVisible ? (
            <button className="ghostButton" onClick={() => setRulesVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more rules
            </button>
          ) : null}
        </section>

        <section className="panel">
          <div className="titleRow">
            <h2>Automation Logs</h2>
            <span className="pill graphitePill">History</span>
          </div>
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading logs...</li> : logs.length ? visibleLogsSlice.map((l) => (
              <li key={l.id}>
                <strong>{l.status.toUpperCase()}</strong> - {new Date(l.startedAt).toLocaleString()} {l.error ? `- ${l.error}` : ""}
              </li>
            )) : <li className="muted">No execution logs yet.</li>}
          </ul>
          {logs.length > logsVisible ? (
            <button className="ghostButton" onClick={() => setLogsVisible((current) => current + VISIBLE_ITEMS_STEP)}>
              Show more logs
            </button>
          ) : null}
        </section>
      </div> : null}
    </main>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function parseReminderCommand(raw: string): { text: string; dueAt: string } {
  const body = raw.replace(/^remind\s+/i, "").trim();
  const tomorrowMatch = body.match(/^(.*)\s+tomorrow\s+at\s+(\d{1,2}):(\d{2})$/i);
  if (tomorrowMatch) {
    const text = tomorrowMatch[1].trim();
    const hours = Number(tomorrowMatch[2]);
    const minutes = Number(tomorrowMatch[3]);
    if (!text) throw new Error("Reminder text is required.");
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Use a valid time in 24h format, for example: remind check backup tomorrow at 09:00");
    }
    const due = new Date();
    due.setDate(due.getDate() + 1);
    due.setHours(hours, minutes, 0, 0);
    return { text, dueAt: due.toISOString() };
  }

  const match = body.match(/^(.*)\s+in\s+(\d+)\s*([mh])$/i);
  if (match) {
    const text = match[1].trim();
    const amount = Number(match[2]);
    const unit = match[3].toLowerCase();
    const minutes = unit === "h" ? amount * 60 : amount;
    if (!text) throw new Error("Reminder text is required.");
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Reminder time must be positive.");
    return { text, dueAt: new Date(Date.now() + minutes * 60_000).toISOString() };
  }

  const atMatch = body.match(/^(.*)\s+at\s+(\d{1,2}):(\d{2})$/i);
  if (atMatch) {
    const text = atMatch[1].trim();
    const hours = Number(atMatch[2]);
    const minutes = Number(atMatch[3]);
    if (!text) throw new Error("Reminder text is required.");
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Use a valid time in 24h format, for example: remind send report at 16:30");
    }
    const due = new Date();
    due.setHours(hours, minutes, 0, 0);
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
  const lower = input.trim().toLowerCase();
  if (lower === "today" || lower === "what's next" || lower === "whats next") {
    return "list reminders";
  }
  if (lower === "sync") return "refresh";
  return input.trim();
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function RuleForm({
  devices,
  onDone,
  onError
}: {
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
  return (
    <div className="row">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <input type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <select value={actionType} onChange={(e) => setActionType(e.target.value as "localReminder" | "haToggle")}>
        <option value="localReminder">Create reminder</option>
        <option value="haToggle">Toggle device</option>
      </select>
      {actionType === "localReminder" ? (
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reminder text to create" />
      ) : (
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          <option value="">Select device</option>
          {devices.map((d) => <option key={d.entityId} value={d.entityId}>{d.friendlyName}</option>)}
        </select>
      )}
      <button
        disabled={isSubmitting}
        onClick={async () => {
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
        }}
      >
        {isSubmitting ? "Adding..." : "Add Rule"}
      </button>
    </div>
  );
}

function QuickNoteForm({ onDone, onError }: { onDone: () => Promise<void>; onError: (message: string) => void }): JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="row">
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button
        disabled={isSubmitting}
        onClick={async () => {
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
        }}
      >
        {isSubmitting ? "Adding..." : "Add"}
      </button>
    </div>
  );
}

function ReminderForm({ onDone, onError }: { onDone: () => Promise<void>; onError: (message: string) => void }): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="row">
      <input placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <input
        type="datetime-local"
        value={dueAt}
        min={toLocalDateTimeInputValue(new Date())}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <button
        disabled={isSubmitting}
        onClick={async () => {
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
        }}
      >
        {isSubmitting ? "Scheduling..." : "Schedule"}
      </button>
    </div>
  );
}

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
