import type { Ref, RefObject } from "react";
import type { ReminderFilter } from "../../types";
import type { AiActionDraft } from "../../../shared/ai/types";
import { Send, Loader2, Trash2, X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { CommandExamples } from "../layout/CommandExamples";
import { AiActionPreview } from "../AiActionPreview";

type Props = {
  commandInputRef: RefObject<HTMLInputElement | null>;
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
  /** When the command field is empty, Escape hides the desk window (background behavior). */
  onHideDeskIfInputEmpty?: () => void;
  aiDraft: AiActionDraft | null;
  aiReply: string | null;
  onConfirmAiDraft: () => Promise<void>;
  onCancelAiDraft: () => void;
  aiConfigured: boolean;
};

export function CommandPanel({
  commandInputRef,
  query,
  reminderFilter: _reminderFilter,
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
  onHideDeskIfInputEmpty,
  aiDraft,
  aiReply,
  onConfirmAiDraft,
  onCancelAiDraft,
  aiConfigured
}: Props): JSX.Element {
  return (
    <section className={`panel commandPanel secretaryAsk${isRunningCommand ? " commandPanelThinking" : ""}`}>
      {isRunningCommand ? (
        <p className="assistantThinkingInline" aria-live="polite">
          Working on that...
        </p>
      ) : null}
      {aiConfigured && (
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-1)" }}>
          Natural-language AI fallback is on.
        </p>
      )}
      <div className="row commandRow">
        <input
          ref={commandInputRef as Ref<HTMLInputElement>}
          className="fullWidth commandInputHero"
          placeholder="Type a command..."
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
        <IconButton
          icon={isRunningCommand ? Loader2 : Send}
          label="Send command"
          onClick={() => void onRunCommand(commandInput)}
          disabled={isRunningCommand}
          variant="default"
          size={18}
          className="commandActionHero"
        />
      </div>
      <div className="commandHintsCompact">
        {commandHints.length ? (
          commandHints.map((hint) => (
            <button
              type="button"
              key={hint}
              className="pillButton pillButtonCompact"
              onClick={() => setCommandInput(hint)}
            >
              {hint}
            </button>
          ))
        ) : (
          <span className="muted commandHintText">
            Try <code>help</code>
          </span>
        )}
        {commandHistory.length > 0 ? (
          <IconButton icon={Trash2} label="Clear command history" onClick={onClearHistory} variant="ghost" size={13} />
        ) : null}
        {query ? (
          <IconButton icon={X} label="Clear memo search" onClick={onClearNoteSearch} variant="ghost" size={13} />
        ) : null}
      </div>
      {aiDraft && (
        <AiActionPreview
          draft={aiDraft}
          onConfirm={onConfirmAiDraft}
          onCancel={onCancelAiDraft}
          isConfirming={isRunningCommand}
        />
      )}
      {aiReply && !aiDraft && (
        <div style={{ marginTop: "var(--space-2)", fontSize: "0.85em", color: "var(--muted)" }}>AI: {aiReply}</div>
      )}
      <CommandExamples haReady={haReady} onRunPreset={onPreset} />
    </section>
  );
}
