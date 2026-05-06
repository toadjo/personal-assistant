import { memo, useState } from "react";
import type { Note } from "../../../shared/types";
import { StickyNote, Pencil, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { QuickNoteForm } from "../forms/QuickNoteForm";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";

type UpdatePayload = {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
};

type Props = {
  onFetchNotes: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
  onDeleteNote: (id: string, title: string) => void;
  onUpdateNote: (payload: UpdatePayload) => void;
  onNoteCreated?: () => void;
};

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export const NotesPanel = memo(function NotesPanel({
  onFetchNotes,
  onError,
  onShowSuccess,
  onDeleteNote,
  onUpdateNote,
  onNoteCreated
}: Props): JSX.Element {
  const { notes, isRefreshing } = useWorkspaceStore(
    useShallow((s) => ({
      notes: s.notes,
      isRefreshing: s.isRefreshing
    }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);

  function startEdit(n: Note): void {
    setEditingId(n.id);
    setDraftTitle(n.title);
    setDraftContent(n.content);
    setDraftTags(n.tags.join(", "));
    setDraftPinned(n.pinned);
  }

  function cancelEdit(): void {
    setEditingId(null);
  }

  function saveEdit(id: string): void {
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!title) {
      onError("Title is required.");
      return;
    }
    onUpdateNote({
      id,
      title,
      content,
      tags: parseTagsInput(draftTags),
      pinned: draftPinned
    });
    setEditingId(null);
  }

  return (
    <section className="panel" aria-labelledby="notes-panel-heading">
      <PanelHeader icon={StickyNote} title="Memos" />
      <QuickNoteForm onDone={onFetchNotes} onError={onError} onShowSuccess={onShowSuccess} onCreated={onNoteCreated} />
      <div className="notesGrid" aria-label="Saved memos">
        {isRefreshing ? (
          <p className="muted">Loading…</p>
        ) : notes.length ? (
          notes.map((n) => (
            <article key={n.id} className={`noteCard ${n.pinned ? "noteCardPinned" : ""}`}>
              {editingId === n.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                  <input
                    className="fullWidth"
                    aria-label="Memo title"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                  <textarea
                    className="fullWidth"
                    aria-label="Memo body"
                    rows={3}
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                  />
                  <input
                    className="fullWidth"
                    placeholder="Tags (comma-separated)"
                    aria-label="Memo tags"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                  />
                  <label className="row" style={{ gap: "0.5rem" }} htmlFor={`memo-pinned-${n.id}`}>
                    <input
                      id={`memo-pinned-${n.id}`}
                      type="checkbox"
                      checked={draftPinned}
                      onChange={(e) => setDraftPinned(e.target.checked)}
                    />
                    Pinned
                  </label>
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="commandAction"
                      onClick={() => saveEdit(n.id)}
                      aria-label="Save memo changes"
                    >
                      Save
                    </button>
                    <button type="button" className="ghostButton" onClick={cancelEdit} aria-label="Cancel memo edit">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="noteCardContent">
                    <h3>{n.title}</h3>
                    <p>{n.content}</p>
                    {n.tags.length ? (
                      <div className="noteCardTags">
                        {n.tags.map((tag) => (
                          <span key={tag} className="pill graphitePill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="noteCardActions">
                    <IconButton
                      icon={Pencil}
                      label={`Edit memo ${n.title}`}
                      onClick={() => startEdit(n)}
                      variant="ghost"
                      size={14}
                    />
                    <IconButton
                      icon={Trash2}
                      label={`Delete memo ${n.title}`}
                      onClick={() => void onDeleteNote(n.id, n.title)}
                      variant="danger"
                      size={14}
                    />
                  </div>
                </>
              )}
            </article>
          ))
        ) : (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Notes are for quick memos you want to keep. Use the form above to create your first note."
          />
        )}
      </div>
    </section>
  );
});
