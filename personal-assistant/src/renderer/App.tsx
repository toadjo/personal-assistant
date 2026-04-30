import { useEffect, useMemo, useState } from "react";
import type { Note, Reminder } from "../shared/types";

export function App(): JSX.Element {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [devices, setDevices] = useState<Array<{ entityId: string; friendlyName: string; state: string }>>([]);
  const [logs, setLogs] = useState<Array<{ id: string; status: string; startedAt: string; error?: string }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; name: string; triggerConfig: { at: string }; actionType: string }>>([]);

  async function refreshAll(): Promise<void> {
    setNotes(await window.assistantApi.listNotes(query));
    setReminders(await window.assistantApi.listReminders());
    setDevices(await window.assistantApi.listDevices());
    setLogs(await window.assistantApi.listExecutionLogs());
    setRules(await window.assistantApi.listRules());
  }

  useEffect(() => {
    void refreshAll();
    const off = window.assistantApi.onRemindersUpdated(() => void refreshAll());
    return off;
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refreshAll(), 150);
    return () => clearTimeout(id);
  }, [query]);

  const commandHints = useMemo(
    () => ["new note", "list reminders", "complete task", "toggle switch"].filter((c) => c.includes(query.toLowerCase())),
    [query]
  );

  return (
    <main className="container">
      <h1>Personal Assistant</h1>
      <input placeholder="Command palette..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="row">
        {commandHints.map((hint) => (
          <span key={hint} className="pill">{hint}</span>
        ))}
      </div>

      <section>
        <h2>Quick Note</h2>
        <QuickNoteForm onDone={refreshAll} />
        <ul>{notes.map((n) => <li key={n.id}>{n.title} - {n.content}</li>)}</ul>
      </section>

      <section>
        <h2>Reminders</h2>
        <ReminderForm onDone={refreshAll} />
        <ul>{reminders.map((r) => <li key={r.id}>{r.text} ({r.status})</li>)}</ul>
      </section>

      <section>
        <h2>Home Assistant</h2>
        <div className="row">
          <input placeholder="http://homeassistant.local:8123" value={haUrl} onChange={(e) => setHaUrl(e.target.value)} />
          <input placeholder="Long-lived access token" value={haToken} onChange={(e) => setHaToken(e.target.value)} />
        </div>
        <div className="row">
          <button onClick={async () => { await window.assistantApi.configureHomeAssistant({ url: haUrl, token: haToken }); }}>Save</button>
          <button onClick={async () => { alert((await window.assistantApi.testHomeAssistant()) ? "Connected" : "Failed"); }}>Test</button>
          <button onClick={async () => { await window.assistantApi.refreshHomeAssistantEntities(); await refreshAll(); }}>Refresh Entities</button>
        </div>
        <ul>
          {devices.map((d) => (
            <li key={d.entityId}>
              {d.friendlyName} ({d.state}) <button onClick={async () => { await window.assistantApi.toggleDevice(d.entityId); await refreshAll(); }}>Toggle</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Automation Rules</h2>
        <RuleForm devices={devices} onDone={refreshAll} />
        <ul>{rules.map((r) => <li key={r.id}>{r.name} @ {r.triggerConfig.at} {"->"} {r.actionType}</li>)}</ul>
      </section>

      <section>
        <h2>Automation Logs</h2>
        <ul>{logs.map((l) => <li key={l.id}>{l.startedAt} - {l.status} {l.error || ""}</li>)}</ul>
      </section>
    </main>
  );
}

function RuleForm({
  devices,
  onDone
}: {
  devices: Array<{ entityId: string; friendlyName: string; state: string }>;
  onDone: () => Promise<void>;
}): JSX.Element {
  const [name, setName] = useState("Morning check");
  const [at, setAt] = useState("08:00");
  const [actionType, setActionType] = useState<"localReminder" | "haToggle">("localReminder");
  const [text, setText] = useState("Check your agenda");
  const [entityId, setEntityId] = useState("");
  return (
    <div className="row">
      <input value={name} onChange={(e) => setName(e.target.value)} />
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
          await window.assistantApi.createRule({
            name,
            triggerConfig: { at },
            actionType,
            actionConfig: actionType === "localReminder" ? { text } : { entityId },
            enabled: true
          });
          await onDone();
        }}
      >
        Add Rule
      </button>
    </div>
  );
}

function QuickNoteForm({ onDone }: { onDone: () => Promise<void> }): JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="row">
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={async () => { await window.assistantApi.createNote({ title, content, tags: [], pinned: false }); setTitle(""); setContent(""); await onDone(); }}>Add</button>
    </div>
  );
}

function ReminderForm({ onDone }: { onDone: () => Promise<void> }): JSX.Element {
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 60_000).toISOString().slice(0, 16));
  return (
    <div className="row">
      <input placeholder="Reminder" value={text} onChange={(e) => setText(e.target.value)} />
      <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      <button onClick={async () => { await window.assistantApi.createReminder({ text, dueAt: new Date(dueAt).toISOString(), recurrence: "none" }); setText(""); await onDone(); }}>Schedule</button>
    </div>
  );
}
