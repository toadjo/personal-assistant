import { useEffect, useMemo, useRef, useState } from "react";
import type { Note, Reminder } from "../shared/types";

type ThemeMode = "light" | "dark";

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
  const [reminderFilter, setReminderFilter] = useState<"all" | "pending" | "done">("all");
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem("assistant-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !window.localStorage.getItem("assistant-onboarded"));

  async function refreshAll(): Promise<void> {
    try {
      setError("");
      setIsRefreshing(true);
      setNotes(await window.assistantApi.listNotes(query));
      setReminders(await window.assistantApi.listReminders());
      setDevices(await window.assistantApi.listDevices());
      setLogs(await window.assistantApi.listExecutionLogs());
      setRules(await window.assistantApi.listRules());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    const off = window.assistantApi.onRemindersUpdated(() => void refreshAll());
    return off;
  }, []);

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
    const id = setTimeout(() => void refreshAll(), 150);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const off = window.assistantApi.onCommand((_, command) => {
      setCommandInput(command === "new note" ? "new note " : command);
      commandInputRef.current?.focus();
      setStatus(`Tray command: ${command}`);
    });
    return off;
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

  const commandHints = useMemo(
    () => [
      "new note Buy milk",
      "remind Call mom in 15m",
      "search groceries",
      "list reminders",
      "toggle kitchen light"
    ].filter((c) => c.includes(commandInput.toLowerCase())),
    [commandInput]
  );
  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const overdueReminders = pendingReminders.filter((r) => new Date(r.dueAt).getTime() < Date.now());
  const visibleReminders = reminders.filter((r) => reminderFilter === "all" || r.status === reminderFilter);
  const haReady = Boolean(haUrl.trim() && (hasHaToken || haToken.trim()));
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

  function runPresetCommand(command: string): void {
    setCommandInput(command);
    void runCommandInternal(command);
  }

  async function runCommandInternal(rawInput: string): Promise<void> {
    const raw = rawInput.trim();
    if (!raw) return;
    try {
      setError("");
      setIsRunningCommand(true);
      const normalized = normalizeCommandAlias(raw);
      const lower = normalized.toLowerCase();

      if (lower === "help") {
        setStatus("Try: new note, remind <text> in 15m, search <term>, list reminders, toggle <device>, refresh devices.");
      } else if (lower === "list reminders") {
        setReminderFilter("pending");
        setStatus("Showing pending reminders.");
      } else if (lower.startsWith("search ")) {
        const term = normalized.slice(7).trim();
        setQuery(term);
        setStatus(`Searching notes for "${term}".`);
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
        setStatus(`Reminder scheduled for ${new Date(parsed.dueAt).toLocaleTimeString()}.`);
      } else if (lower === "remind") {
        throw new Error("Use a reminder command like: remind call mom in 15m");
      } else if (lower.startsWith("toggle ")) {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        const target = raw.slice(7).trim().toLowerCase();
        const device = devices.find((d) =>
          d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
        );
        if (!device) throw new Error(`No device matches "${target}".`);
        await window.assistantApi.toggleDevice(device.entityId);
        setStatus(`Toggled ${device.friendlyName}.`);
      } else if (lower === "refresh devices") {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        await window.assistantApi.refreshHomeAssistantEntities();
        setStatus("Home Assistant devices refreshed.");
      } else {
        throw new Error("Unknown command. Try: new note, remind, search, list reminders, toggle, refresh devices.");
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
          <button
            className="themeToggle"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            aria-label="Toggle light and dark theme"
          >
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
          <span className="stat">Notes: {notes.length}</span>
          <span className="stat">Pending reminders: {pendingReminders.length}</span>
          <span className="stat">Overdue: {overdueReminders.length}</span>
          <span className="stat">Devices: {devices.length}</span>
          <span className="stat">HA: {haReady ? "Ready" : "Setup needed"}</span>
        </div>
      </header>

      {status ? <p className="status" role="status">Success: {status}</p> : null}
      {error ? <p className="error" role="alert">Error: {error}</p> : null}

      {showOnboarding ? (
        <section className="panel onboarding">
          <div className="titleRow">
            <h2>Quick Start</h2>
            <button
              className="ghostButton"
              onClick={() => {
                setShowOnboarding(false);
                window.localStorage.setItem("assistant-onboarded", "1");
              }}
            >
              Got it
            </button>
          </div>
          <p className="muted">1) Add your Home Assistant URL + token, then click <strong>Refresh Entities</strong>.</p>
          <p className="muted">2) Use the command prompt for fast actions in plain English.</p>
          <div className="presetRow">
            <button className="ghostButton" onClick={() => runPresetCommand("new note check water filter")}>Create sample note</button>
            <button className="ghostButton" onClick={() => runPresetCommand("remind stretch in 10m")}>Create sample reminder</button>
            <button className="ghostButton" onClick={() => runPresetCommand("list reminders")}>Show reminders</button>
          </div>
        </section>
      ) : null}

      <section className="panel commandPanel">
        <div className="titleRow">
          <h2>Command Prompt</h2>
          <span className="pill">Natural language</span>
        </div>
        <p className="muted sectionIntro">Run one assistant action at a time in plain English.</p>
        <div className="row commandRow">
          <input
            ref={commandInputRef}
            className="fullWidth"
            placeholder="Type a command and press Enter..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runCommandInternal(commandInput);
            }}
          />
          <button className="commandAction" onClick={() => void runCommandInternal(commandInput)} disabled={isRunningCommand}>
            {isRunningCommand ? "Running..." : "Run"}
          </button>
        </div>
        <div className="row commandHintsRow">
          {commandHints.length ? commandHints.map((hint) => (
            <button key={hint} className="pillButton" onClick={() => setCommandInput(hint)}>{hint}</button>
          )) : <span className="muted">No matching command hints.</span>}
        </div>
        <p className="muted">Examples: <code>new note buy coffee</code>, <code>remind stand up in 10m</code>, <code>toggle bedroom</code>.</p>
        <p className="muted">Tip: type one action at a time in plain English and press Enter.</p>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Productivity Snapshot</h2>
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
      </div>

      <div className="grid">
        <section className="panel">
          <h2>Quick Note</h2>
          <p className="muted sectionIntro">Capture thoughts quickly and keep your recent notes in view.</p>
          <QuickNoteForm
            onDone={refreshAll}
            onError={(message) => setError(message)}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading notes...</li> : notes.length ? notes.map((n) => (
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
            {isRefreshing ? <li className="muted">Loading reminders...</li> : visibleReminders.length ? visibleReminders.map((r) => (
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
        </section>
      </div>

      <section className="panel">
        <h2>Home Assistant</h2>
        <p className="muted sectionIntro">Connect your Home Assistant instance to control synced entities.</p>
        <div className="row">
          <input
            placeholder="http://homeassistant.local:8123"
            value={haUrl}
            onChange={(e) => setHaUrl(e.target.value)}
          />
          <input
            placeholder="Long-lived access token"
            value={haToken}
            onChange={(e) => setHaToken(e.target.value)}
          />
        </div>
        <p className="muted">Status: {haReady ? "Ready to test and control devices." : "Enter URL and token, then Save."}</p>
        <div className="row">
          <button
            disabled={isSavingHa}
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
                setStatus((await window.assistantApi.testHomeAssistant()) ? "Home Assistant connected." : "Home Assistant test failed.");
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
                await refreshAll();
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
          {isRefreshing ? <li className="muted">Loading devices...</li> : devices.length ? devices.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>{d.friendlyName} ({d.state})</span>
              <button
                className="ghostButton"
                onClick={async () => {
                  try {
                    setError("");
                    await window.assistantApi.toggleDevice(d.entityId);
                    await refreshAll();
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
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Automation Rules</h2>
          <RuleForm
            devices={devices}
            onDone={refreshAll}
            onError={(message) => setError(message)}
          />
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading rules...</li> : rules.length ? rules.map((r) => (
              <li key={r.id}>
                {r.name} at {r.triggerConfig.at} {"->"} {r.actionType === "haToggle" ? "Toggle Home Assistant entity" : "Create local reminder"}
              </li>
            )) : <li className="muted">No rules yet.</li>}
          </ul>
        </section>

        <section className="panel">
          <h2>Automation Logs</h2>
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading logs...</li> : logs.length ? logs.map((l) => (
              <li key={l.id}>
                <strong>{l.status.toUpperCase()}</strong> - {new Date(l.startedAt).toLocaleString()} {l.error ? `- ${l.error}` : ""}
              </li>
            )) : <li className="muted">No execution logs yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function parseReminderCommand(raw: string): { text: string; dueAt: string } {
  const body = raw.replace(/^remind\s+/i, "").trim();
  const match = body.match(/^(.*)\s+in\s+(\d+)\s*([mh])$/i);
  if (!match) {
    throw new Error("Use reminder command like: remind call mom in 15m");
  }
  const text = match[1].trim();
  const amount = Number(match[2]);
  const unit = match[3].toLowerCase();
  const minutes = unit === "h" ? amount * 60 : amount;
  if (!text) throw new Error("Reminder text is required.");
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Reminder time must be positive.");
  return { text, dueAt: new Date(Date.now() + minutes * 60_000).toISOString() };
}

function normalizeCommandAlias(input: string): string {
  const lower = input.trim().toLowerCase();
  if (lower === "today" || lower === "what's next" || lower === "whats next") {
    return "list reminders";
  }
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
  return (
    <div className="row">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <input type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <select value={actionType} onChange={(e) => setActionType(e.target.value as "localReminder" | "haToggle")}>
        <option value="localReminder">localReminder</option>
        <option value="haToggle">haToggle</option>
      </select>
      {actionType === "localReminder" ? (
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reminder text" />
      ) : (
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          <option value="">Select device</option>
          {devices.map((d) => <option key={d.entityId} value={d.entityId}>{d.friendlyName}</option>)}
        </select>
      )}
      <button
        onClick={async () => {
          try {
            if (!name.trim()) throw new Error("Rule name is required.");
            if (actionType === "haToggle" && !entityId) throw new Error("Select a device for haToggle actions.");
            await window.assistantApi.createRule({
              name,
              triggerConfig: { at },
              actionType,
              actionConfig: actionType === "localReminder" ? { text } : { entityId },
              enabled: true
            });
            await onDone();
          } catch (err) {
            onError(getErrorMessage(err));
          }
        }}
      >
        Add Rule
      </button>
    </div>
  );
}

function QuickNoteForm({ onDone, onError }: { onDone: () => Promise<void>; onError: (message: string) => void }): JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="row">
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button
        onClick={async () => {
          try {
            if (!title.trim() && !content.trim()) throw new Error("Write a title or content before adding a note.");
            await window.assistantApi.createNote({ title: title.trim() || "Untitled", content: content.trim(), tags: [], pinned: false });
            setTitle("");
            setContent("");
            await onDone();
          } catch (err) {
            onError(getErrorMessage(err));
          }
        }}
      >
        Add
      </button>
    </div>
  );
}

function ReminderForm({ onDone, onError }: { onDone: () => Promise<void>; onError: (message: string) => void }): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
  return (
    <div className="row">
      <input placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      <button
        onClick={async () => {
          try {
            if (!text.trim()) throw new Error("Reminder text is required.");
            const parsedDueAt = parseLocalDateTimeInput(dueAt);
            await window.assistantApi.createReminder({ text: text.trim(), dueAt: parsedDueAt, recurrence: "none" });
            setText("");
            await onDone();
          } catch (err) {
            onError(getErrorMessage(err));
          }
        }}
      >
        Schedule
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
