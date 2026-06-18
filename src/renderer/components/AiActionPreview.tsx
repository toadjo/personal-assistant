import { Check, X } from "lucide-react";
import type { AiActionDraft } from "../../shared/ai/types";

type Props = {
  draft: AiActionDraft;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isConfirming: boolean;
};

export function AiActionPreview({ draft, onConfirm, onCancel, isConfirming }: Props): JSX.Element {
  function getDraftDescription(): string {
    switch (draft.type) {
      case "create_note":
        return `Create note: "${draft.title}"${draft.content ? ` with content` : ""}`;
      case "create_task":
        return `Create task: "${draft.title}"${draft.dueAt ? ` due ${new Date(draft.dueAt).toLocaleDateString()}` : ""}${draft.priority ? ` (${draft.priority})` : ""}`;
      case "create_reminder":
        return `Create reminder: "${draft.text}" due ${new Date(draft.dueAt).toLocaleString()}`;
      case "toggle_device":
        return `Toggle device: ${draft.friendlyName || draft.entityId}`;
    }
  }

  return (
    <div
      style={{
        marginTop: "var(--space-2)",
        padding: "var(--space-2)",
        backgroundColor: "var(--panelBg)",
        border: "1px solid var(--borderColor)",
        borderRadius: "4px"
      }}
    >
      <div style={{ marginBottom: "var(--space-2)", fontSize: "0.9em", fontWeight: 500 }}>AI Suggestion:</div>
      <div style={{ marginBottom: "var(--space-2)", fontSize: "0.85em" }}>{getDraftDescription()}</div>
      <div className="row" style={{ gap: "0.5rem" }}>
        <button type="button" className="ghostButton" onClick={() => void onConfirm()} disabled={isConfirming}>
          <Check size={14} />
          {isConfirming ? "Confirming..." : "Confirm"}
        </button>
        <button type="button" className="ghostButton dangerGhostButton" onClick={onCancel} disabled={isConfirming}>
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}
