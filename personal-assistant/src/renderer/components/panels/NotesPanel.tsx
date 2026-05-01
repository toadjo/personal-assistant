import type { Note } from "../../../shared/types";
import { QuickNoteForm } from "../forms/QuickNoteForm";

type Props = {
  isRefreshing: boolean;
  notes: Note[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onDeleteNote: (id: string, title: string) => void;
};

export function NotesPanel({ isRefreshing, notes, onRefresh, onError, onDeleteNote }: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Notes</h2>
      </div>
      <QuickNoteForm onDone={onRefresh} onError={onError} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : notes.length ? (
          notes.map((n) => (
            <li key={n.id} className="listRow">
              <span>
                {n.title} — {n.content}
              </span>
              <button type="button" className="dangerButton" onClick={() => void onDeleteNote(n.id, n.title)}>
                Delete
              </button>
            </li>
          ))
        ) : (
          <li className="muted">No notes yet.</li>
        )}
      </ul>
    </section>
  );
}
