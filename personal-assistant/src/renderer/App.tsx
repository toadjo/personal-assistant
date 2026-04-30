import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
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
  const [logs, setLogs] = useState<Array<{
    id: string;
    status: string;
    startedAt: string;
    error?: string;
    attemptCount: number;
    retryCount: number;
  }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; name: string; triggerConfig: { at: string }; actionType: string }>>([]);
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem("assistant-command-history");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 8);
    } catch {
      return [];
    }
  });
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isRefreshingHa, setIsRefreshingHa] = useState(false);
  const [isSavingHa, setIsSavingHa] = useState(false);
  const [togglingEntityIds, setTogglingEntityIds] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    window.localStorage.setItem("assistant-command-history", JSON.stringify(commandHistory.slice(0, 8)));
  }, [commandHistory]);

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
  const hasHaUrl = Boolean(haUrl.trim());
  const canSaveHa = hasHaUrl && (hasHaToken || Boolean(haToken.trim()));
  const isEntityTogglePending = (entityId: string) => togglingEntityIds.has(entityId);
  const haStatusText = !hasHaUrl
    ? "URL missing. Add URL and token, then Save."
    : !hasHaToken && !haToken.trim()
      ? "Token missing. Add token, then Save."
      : haReady
        ? "Ready. Test connection and refresh entities."
        : "Configuration incomplete. Review URL/token and Save.";
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
  const proactiveTip = useMemo(() => {
    if (!haReady) return "Assistant tip: connect Home Assistant to unlock device commands like `toggle kitchen light`.";
    if (overdueReminders.length > 0) {
      return `Assistant tip: you have ${overdueReminders.length} overdue reminder${overdueReminders.length === 1 ? "" : "s"} - run 'list reminders' to review now.`;
    }
    if (todayAgenda.length > 0) {
      return `Assistant tip: you have ${todayAgenda.length} item${todayAgenda.length === 1 ? "" : "s"} due today - run 'list reminders' for focus mode.`;
    }
    if (commandHistory.length === 0) {
      return "Assistant tip: start with `help` to see supported commands and fast examples.";
    }
    return "Assistant tip: reuse command history below to repeat frequent actions faster.";
  }, [haReady, overdueReminders.length, todayAgenda.length, commandHistory.length]);

  useEffect(() => {
    if (!showOnboarding) return;
    if (!haReady || commandHistory.length === 0) return;
    window.localStorage.setItem("assistant-onboarded", "1");
    setShowOnboarding(false);
    setStatus("Onboarding completed. You can reopen tips anytime by clearing local storage.");
  }, [showOnboarding, haReady, commandHistory.length]);

  function runPresetCommand(command: string): void {
    setCommandInput(command);
    void runCommandInternal(command);
  }

  async function runDeviceToggle(entityId: string, friendlyName: string): Promise<void> {
    if (isEntityTogglePending(entityId)) {
      setStatus(`Toggle already in progress for ${friendlyName}.`);
      return;
    }
    try {
      setError("");
      setStatus(`Toggling ${friendlyName}...`);
      setTogglingEntityIds((prev) => new Set(prev).add(entityId));
      await window.assistantApi.toggleDevice(entityId);
      setStatus(`${friendlyName} toggled. Refreshing state...`);
      await refreshAll();
      setStatus(`${friendlyName} toggled and synced.`);
    } finally {
      setTogglingEntityIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }
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
        setStatus("Try: new note <text>, remind <text> in 15m, search <term>, list reminders, toggle <device>, refresh devices.");
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
        setStatus(`Reminder scheduled for ${new Date(parsed.dueAt).toLocaleString()}.`);
      } else if (lower === "remind") {
        throw new Error("Use a reminder command like: remind call mom in 15m");
      } else if (lower.startsWith("toggle ")) {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        const target = raw.slice(7).trim().toLowerCase();
        const device = devices.find((d) =>
          d.friendlyName.toLowerCase().includes(target) || d.entityId.toLowerCase().includes(target)
        );
        if (!device) throw new Error(`No device matches "${target}".`);
        await runDeviceToggle(device.entityId, device.friendlyName);
      } else if (lower === "refresh devices") {
        if (!haReady) throw new Error("Home Assistant is not configured yet. Add URL and token in Home Assistant section.");
        setStatus("Refreshing Home Assistant entities...");
        await window.assistantApi.refreshHomeAssistantEntities();
        setStatus("Home Assistant entities refreshed.");
      } else {
        throw new Error("Unknown command. Type 'help' to see supported commands.");
      }

      setCommandHistory((prev) => {
        const next = [normalized, ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase())];
        return next.slice(0, 8);
      });
      setHistoryCursor(-1);
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

      {status ? <p className="status" role="status" aria-live="polite">Success: {status}</p> : null}
      {error ? <p className="error" role="alert" aria-live="assertive">Error: {error}</p> : null}

      {showOnboarding ? (
        <section className="panel onboarding">
          <div className="titleRow">
            <h2>Quick Start</h2>
            <div className="miniActions">
              <button
                className="ghostButton"
                onClick={() => {
                  setShowOnboarding(false);
                  setStatus("Onboarding hidden for now.");
                }}
              >
                Hide for now
              </button>
              <button
                className="ghostButton"
                disabled={!haReady || commandHistory.length === 0}
                onClick={() => {
                  setShowOnboarding(false);
                  window.localStorage.setItem("assistant-onboarded", "1");
                  setStatus("Onboarding completed.");
                }}
              >
                Finish setup
              </button>
            </div>
          </div>
          <p className="muted">1) Add your Home Assistant URL + token, then click <strong>Refresh Entities</strong>.</p>
          <p className="muted">2) Use the command prompt for fast actions in plain English.</p>
          <p className="muted">3) Closing the window keeps the app running in the Windows tray.</p>
          <ul className="onboardingChecklist">
            <li className="onboardingChecklistItem">
              <span>Home Assistant connected</span>
              <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>{haReady ? "Done" : "Pending"}</span>
            </li>
            <li className="onboardingChecklistItem">
              <span>First command executed</span>
              <span className={`onboardingState ${commandHistory.length > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}>
                {commandHistory.length > 0 ? "Done" : "Pending"}
              </span>
            </li>
          </ul>
          <div className="presetRow">
            <button type="button" className="ghostButton" onClick={() => runPresetCommand("new note check water filter")}>Create sample note</button>
            <button type="button" className="ghostButton" onClick={() => runPresetCommand("remind stretch in 10m")}>Create sample reminder</button>
            <button type="button" className="ghostButton" onClick={() => runPresetCommand("list reminders")}>Show reminders</button>
          </div>
        </section>
      ) : null}

      <section className="panel commandPanel">
        <div className="titleRow">
          <h2>Command Prompt</h2>
          <div className="assistantMeta">
            <span className="pill">Natural language</span>
            <span className="pill graphitePill">Assistant-first</span>
          </div>
        </div>
        <p className="muted sectionIntro">Run one assistant action at a time in plain English.</p>
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
            aria-label="Assistant command input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void runCommandInternal(commandInput);
                return;
              }
              if (e.key === "ArrowUp" && commandHistory.length) {
                e.preventDefault();
                const nextCursor = Math.min(historyCursor + 1, commandHistory.length - 1);
                setHistoryCursor(nextCursor);
                setCommandInput(commandHistory[nextCursor] ?? "");
                return;
              }
              if (e.key === "ArrowDown" && commandHistory.length) {
                e.preventDefault();
                const nextCursor = historyCursor - 1;
                if (nextCursor < 0) {
                  setHistoryCursor(-1);
                  setCommandInput("");
                  return;
                }
                setHistoryCursor(nextCursor);
                setCommandInput(commandHistory[nextCursor] ?? "");
              }
            }}
          />
          <button type="button" className="commandAction" onClick={() => void runCommandInternal(commandInput)} disabled={isRunningCommand}>
            {isRunningCommand ? "Running..." : "Run"}
          </button>
        </div>
        <div className="row commandHintsRow">
          {commandHints.length ? commandHints.map((hint) => (
            <button type="button" key={hint} className="pillButton" onClick={() => setCommandInput(hint)}>{hint}</button>
          )) : <span className="muted">No matching command hints. Type <code>help</code> to see all commands.</span>}
        </div>
        <div className="assistantShortcutRow">
          <button type="button" className="ghostButton" onClick={() => setCommandInput("new note ")}>+ Note command</button>
          <button type="button" className="ghostButton" onClick={() => setCommandInput("remind call mom in 15m")}>+ Reminder command</button>
          <button type="button" className="ghostButton" onClick={() => setCommandInput("toggle ")}>+ Device command</button>
        </div>
        <p className="muted">Examples: <code>new note buy coffee</code>, <code>remind stand up in 10m</code>, <code>toggle bedroom</code>.</p>
        <p className="muted commandFootnote">Assistant tip: keep commands short and specific for the fastest response.</p>
        {commandHistory.length ? (
          <div className="row commandHintsRow">
            {commandHistory.map((item) => (
              <button type="button" key={item} className="ghostButton" onClick={() => setCommandInput(item)}>
                {item}
              </button>
            ))}
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                setCommandHistory([]);
                setHistoryCursor(-1);
                setStatus("Command history cleared.");
              }}
            >
              Clear history
            </button>
          </div>
        ) : null}
        <div className="row commandHintsRow">
          <button type="button" className="ghostButton" onClick={() => runPresetCommand("help")}>Show commands</button>
          <button type="button" className="ghostButton" onClick={() => runPresetCommand("list reminders")}>Show pending reminders</button>
          <button type="button" className="ghostButton" onClick={() => setQuery("")}>Clear note search</button>
        </div>
        <p className="muted">Tip: type one action at a time in plain English and press Enter.</p>
        <p className="muted">Tip: use <code>list reminders</code> after adding reminders to quickly review pending items.</p>
        <p className="muted assistantTip">{proactiveTip}</p>
      </section>

      <div className="grid">
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
              <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>Prev</button>
              <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date())}>Today</button>
              <button type="button" className="ghostButton" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>Next</button>
            </div>
          </div>
          <p className="muted">{calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
          <p className="muted sectionIntro">See upcoming load quickly with day badges and today focus.</p>
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
            <select aria-label="Filter reminders by status" value={reminderFilter} onChange={(e) => setReminderFilter(e.target.value as "all" | "pending" | "done")}>
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
        <div className="titleRow">
          <h2>Home Assistant</h2>
          <span className="pill graphitePill">Smart home</span>
        </div>
        <p className="muted sectionIntro">Connect your Home Assistant instance to control synced entities.</p>
        <div className="row">
          <input
            placeholder="http://homeassistant.local:8123"
            aria-label="Home Assistant URL"
            value={haUrl}
            onChange={(e) => setHaUrl(e.target.value)}
          />
          <input
            placeholder="Long-lived access token"
            aria-label="Home Assistant long-lived access token"
            type="password"
            autoComplete="new-password"
            value={haToken}
            onChange={(e) => setHaToken(e.target.value)}
          />
        </div>
        <p className="muted">Status: {haStatusText}</p>
        <p className="muted">If Save succeeds, you can leave token blank on future edits unless you want to replace it.</p>
        {!hasHaUrl ? <p className="muted">Tip: include protocol in URL (for example: <code>http://homeassistant.local:8123</code>).</p> : null}
        {!hasHaToken && !haToken.trim() ? <p className="muted">Add a long-lived token to finish first-time setup.</p> : null}
        <div className="row">
          <button
            disabled={isSavingHa || !canSaveHa}
            onClick={async () => {
              try {
                setError("");
                setIsSavingHa(true);
                setStatus("Saving Home Assistant configuration...");
                await window.assistantApi.configureHomeAssistant({ url: haUrl, token: haToken });
                const config = await window.assistantApi.getHomeAssistantConfig();
                setHasHaToken(config.hasToken);
                setHaToken("");
                setStatus("Configuration saved. Next: Test connection, then Refresh Entities.");
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
                setStatus("Testing Home Assistant connection...");
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
                setStatus("Refreshing Home Assistant entities...");
                await window.assistantApi.refreshHomeAssistantEntities();
                setStatus("Entities refreshed. Syncing local view...");
                await refreshAll();
                setStatus("Entities refreshed and synced.");
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
                disabled={isEntityTogglePending(d.entityId)}
                onClick={async () => {
                  try {
                    await runDeviceToggle(d.entityId, d.friendlyName);
                  } catch (err) {
                    setError(getErrorMessage(err));
                  }
                }}
              >
                {isEntityTogglePending(d.entityId) ? "Toggling..." : "Toggle"}
              </button>
            </li>
          )) : <li className="muted">No synced devices yet. Save credentials and refresh entities.</li>}
        </ul>
      </section>

      <div className="grid">
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
            {isRefreshing ? <li className="muted">Loading rules...</li> : rules.length ? rules.map((r) => (
              <li key={r.id}>
                {r.name} at {r.triggerConfig.at} {"->"} {r.actionType === "haToggle" ? "Toggle Home Assistant entity" : "Create local reminder"}
              </li>
            )) : <li className="muted">No rules yet.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="titleRow">
            <h2>Automation Logs</h2>
            <span className="pill graphitePill">History</span>
          </div>
          <ul className="list">
            {isRefreshing ? <li className="muted">Loading logs...</li> : logs.length ? logs.map((l) => (
              <li key={l.id}>
                <strong>{l.status.toUpperCase()}</strong> - {new Date(l.startedAt).toLocaleString()} - {formatRetrySummary(l.attemptCount, l.retryCount)} {l.error ? `- ${l.error}` : ""}
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
    throw new Error("Use: remind <text> in <number><m|h>. Example: remind call mom in 15m");
  }
  const text = match[1].trim();
  const amount = Number(match[2]);
  const unit = match[3].toLowerCase();
  const minutes = unit === "h" ? amount * 60 : amount;
  if (!text) throw new Error("Reminder text is required.");
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Reminder time must be positive.");
  const dueAtMs = Date.now() + minutes * 60_000;
  if (!Number.isFinite(dueAtMs)) {
    throw new Error("Reminder time is too large. Use a smaller value.");
  }
  const dueAt = new Date(dueAtMs);
  if (!Number.isFinite(dueAt.getTime())) {
    throw new Error("Reminder time is out of supported range.");
  }
  return { text, dueAt: dueAt.toISOString() };
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="row">
      <input aria-label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
      <input aria-label="Rule trigger time" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      <select aria-label="Rule action type" value={actionType} onChange={(e) => setActionType(e.target.value as "localReminder" | "haToggle")}>
        <option value="localReminder">Create reminder</option>
        <option value="haToggle">Toggle device</option>
      </select>
      {actionType === "localReminder" ? (
        <input aria-label="Reminder text to create" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reminder text to create" />
      ) : (
        <select aria-label="Device to toggle" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
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
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      if (!title.trim() && !content.trim()) throw new Error("Write a title or content before adding a note.");
      await window.assistantApi.createNote({ title: title.trim() || "Untitled", content: content.trim(), tags: [], pinned: false });
      setTitle("");
      setContent("");
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    }
  }
  return (
    <form className="row" onSubmit={(event) => void handleSubmit(event)}>
      <input aria-label="Quick note title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input aria-label="Quick note content" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">
        Add
      </button>
    </form>
  );
}

function ReminderForm({ onDone, onError }: { onDone: () => Promise<void>; onError: (message: string) => void }): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(toLocalDateTimeInputValue(new Date(Date.now() + 60_000)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (!text.trim()) throw new Error("Reminder text is required.");
      const parsedDueAt = parseLocalDateTimeInput(dueAt);
      if (new Date(parsedDueAt).getTime() < Date.now() + 30_000) {
        throw new Error("Reminder time must be at least 30 seconds in the future.");
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
    <form className="row" onSubmit={(event) => void handleSubmit(event)}>
      <input aria-label="Reminder text" placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <input
        aria-label="Reminder date and time"
        type="datetime-local"
        value={dueAt}
        min={toLocalDateTimeInputValue(new Date(Date.now() + 60_000))}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Scheduling..." : "Schedule"}
      </button>
    </form>
  );
}

function toLocalDateTimeInputValue(date: Date): string {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function parseLocalDateTimeInput(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error("Pick a valid date and time for the reminder.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    throw new Error("Pick a valid local date and time for the reminder.");
  }
  return parsed.toISOString();
}

function formatRetrySummary(attemptCount: number, retryCount: number): string {
  if (!Number.isFinite(retryCount) || retryCount <= 0) return "No retries";
  const safeAttempts = Number.isFinite(attemptCount) && attemptCount > 0 ? Math.floor(attemptCount) : retryCount + 1;
  return `${retryCount} retr${retryCount === 1 ? "y" : "ies"} (${safeAttempts} attempts)`;
}
