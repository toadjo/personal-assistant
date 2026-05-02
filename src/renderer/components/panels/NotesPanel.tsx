import { useState } from "react";
import type { Note } from "../../../shared/types";
import { QuickNoteForm } from "../forms/QuickNoteForm";

type UpdatePayload = {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
};

type Props = {
  isRefreshing: boolean;
  notes: Note[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onDeleteNote: (id: string, title: string) => void;
  onUpdateNote: (payload: UpdatePayload) => void;
};

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function NotesPanel({
  isRefreshing,
  notes,
  onRefresh,
  onError,
  onDeleteNote,
  onUpdateNote
}: Props): JSX.Element {
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
    <section className="panel">
      <div className="titleRow">
        <h2>Memos</h2>
      </div>
      <QuickNoteForm onDone={onRefresh} onError={onError} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : notes.length ? (
          notes.map((n) => (
            <li key={n.id} className="listRow">
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
                  <label className="row" style={{ gap: "0.5rem" }}>
                    <input type="checkbox" checked={draftPinned} onChange={(e) => setDraftPinned(e.target.checked)} />
                    Pinned
                  </label>
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <button type="button" className="commandAction" onClick={() => saveEdit(n.id)}>
                      Save
                    </button>
                    <button type="button" className="ghostButton" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>
                    {n.pinned ? "(pinned) " : null}
                    {n.title} — {n.content}
                    {n.tags.length ? ` [${n.tags.join(", ")}]` : ""}
                  </span>
                  <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
                    <button type="button" className="ghostButton" onClick={() => startEdit(n)}>
                      Edit
                    </button>
                    <button type="button" className="dangerButton" onClick={() => void onDeleteNote(n.id, n.title)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        ) : (
          <li className="muted">No notes yet.</li>
        )}
      </ul>
    </section>
  );
}
