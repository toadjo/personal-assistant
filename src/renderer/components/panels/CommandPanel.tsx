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
  onRunCommand: (raw: string) => void;
  onClearHistory: () => void;
  onClearNoteSearch: () => void;
  onPreset: (command: string) => void;
  /** When the command field is empty, Escape hides the desk window (tray ergonomics). */
  onHideDeskIfInputEmpty?: () => void;
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
  onRunCommand,
  onClearHistory,
  onClearNoteSearch,
  onPreset,
  onHideDeskIfInputEmpty
}: Props): JSX.Element {
  const contextLine = [
    query ? `Memos: "${query}"` : null,
    reminderFilter !== "all" ? `Follow-ups: ${reminderFilter}` : null,
    haReady ? null : "Household window not linked yet—I can still help with memos and follow-ups."
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={`panel commandPanel secretaryAsk${isRunningCommand ? " commandPanelThinking" : ""}`}>
      <div className="titleRow">
        <h2>Your brief</h2>
      </div>
      {contextLine ? <p className="muted secretaryContext">{contextLine}</p> : null}
      {isRunningCommand ? (
        <p className="assistantThinking" aria-live="polite">
          Working on that—one moment.
        </p>
      ) : null}
      <div className="row commandRow">
        <input
          ref={commandInputRef}
          className="fullWidth"
          placeholder="Ask me anything—e.g. new note order ink, remind call in 20m, open household…"
          aria-label="Message the assistant"
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
              if (!commandInput.trim() && onHideDeskIfInputEmpty) {
                e.preventDefault();
                onHideDeskIfInputEmpty();
                return;
              }
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
        <button
          type="button"
          className="commandAction"
          onClick={() => void onRunCommand(commandInput)}
          disabled={isRunningCommand}
        >
          {isRunningCommand ? "…" : "Send"}
        </button>
      </div>
      <p className="muted secretaryMeta">
        Enter to send · Esc clears (or hides desk when empty) · ↑↓ past commands · Ctrl+Shift+H hides from anywhere
      </p>
      <div className="row commandHintsRow">
        {commandHints.length ? (
          commandHints.map((hint) => (
            <button type="button" key={hint} className="pillButton" onClick={() => setCommandInput(hint)}>
              {hint}
            </button>
          ))
        ) : (
          <span className="muted">
            Not sure what to say? Try <code>help</code>—I will suggest what I can do.
          </span>
        )}
      </div>
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
      <div className="row commandHintsRow secretaryActions">
        <button type="button" className="ghostButton" onClick={() => onPreset("help")}>
          Help
        </button>
        <button type="button" className="ghostButton" onClick={() => onPreset("list reminders")}>
          Reminders
        </button>
        <button type="button" className="ghostButton" onClick={onClearNoteSearch}>
          Clear memo search
        </button>
      </div>
    </section>
  );
}
