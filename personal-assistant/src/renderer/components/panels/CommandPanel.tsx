import type { Ref } from "react";
import type { ReminderFilter } from "../../types";

type Props = {
  commandInputRef: Ref<HTMLInputElement>;
  query: string;
  reminderFilter: ReminderFilter;
  haReady: boolean;
  commandInput: string;
  setCommandInput: (value: string) => void;
  commandHints: string[];
  commandHistory: string[];
  historyCursor: number;
  setHistoryCursor: (n: number) => void;
  isRunningCommand: boolean;
  proactiveTip: string;
  onRunCommand: (raw: string) => void;
  onFocusCommandInput: () => void;
  onClearHistory: () => void;
  onClearNoteSearch: () => void;
  onPreset: (command: string) => void;
};

export function CommandPanel({
  commandInputRef,
  query,
  reminderFilter,
  haReady,
  commandInput,
  setCommandInput,
  commandHints,
  commandHistory,
  historyCursor,
  setHistoryCursor,
  isRunningCommand,
  proactiveTip,
  onRunCommand,
  onFocusCommandInput,
  onClearHistory,
  onClearNoteSearch,
  onPreset
}: Props): JSX.Element {
  return (
    <section className="panel commandPanel">
      <div className="titleRow">
        <h2>Command Prompt</h2>
        <div className="assistantMeta">
          <span className="pill">Natural language</span>
          <span className="pill graphitePill">Assistant-first</span>
          <button type="button" className="ghostButton" onClick={onFocusCommandInput}>
            Focus input
          </button>
        </div>
      </div>
      <p className="muted sectionIntro">Run one assistant action at a time in plain English.</p>
      <p className="muted commandFootnote">Shortcut: press Ctrl+K (or Cmd+K) to jump to command input.</p>
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
          autoComplete="off"
          spellCheck={false}
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void onRunCommand(commandInput);
              return;
            }
            if (e.key === "Escape") {
              setCommandInput("");
              setHistoryCursor(-1);
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
        <button type="button" className="commandAction" onClick={() => void onRunCommand(commandInput)} disabled={isRunningCommand}>
          {isRunningCommand ? "Running..." : "Run"}
        </button>
      </div>
      <div className="row commandHintsRow">
        {commandHints.length ? (
          commandHints.map((hint) => (
            <button type="button" key={hint} className="pillButton" onClick={() => setCommandInput(hint)}>
              {hint}
            </button>
          ))
        ) : (
          <span className="muted">
            No matching command hints. Type <code>help</code> to see all commands.
          </span>
        )}
      </div>
      <div className="assistantShortcutRow">
        <button type="button" className="ghostButton" onClick={() => setCommandInput("new note ")}>
          + Note command
        </button>
        <button type="button" className="ghostButton" onClick={() => setCommandInput("remind call mom in 15m")}>
          + Reminder command
        </button>
        <button type="button" className="ghostButton" onClick={() => setCommandInput("toggle ")}>
          + Device command
        </button>
      </div>
      <p className="muted">
        Examples: <code>new note buy coffee</code>, <code>remind stand up in 10m</code>, <code>toggle bedroom</code>.
      </p>
      <p className="muted commandFootnote">Assistant tip: keep commands short and specific for the fastest response.</p>
      {commandHistory.length ? (
        <div className="row commandHintsRow">
          {commandHistory.map((item) => (
            <button type="button" key={item} className="ghostButton" onClick={() => setCommandInput(item)}>
              {item}
            </button>
          ))}
          <button type="button" className="ghostButton" onClick={onClearHistory}>
            Clear history
          </button>
        </div>
      ) : null}
      <div className="row commandHintsRow">
        <button type="button" className="ghostButton" onClick={() => onPreset("help")}>
          Show commands
        </button>
        <button type="button" className="ghostButton" onClick={() => onPreset("list reminders")}>
          Show pending reminders
        </button>
        <button type="button" className="ghostButton" onClick={onClearNoteSearch}>
          Clear note search
        </button>
      </div>
      <p className="muted">Tip: type one action at a time in plain English and press Enter.</p>
      <p className="muted">Tip: use <code>list reminders</code> after adding reminders to quickly review pending items.</p>
      <p className="muted assistantTip">{proactiveTip}</p>
    </section>
  );
}
