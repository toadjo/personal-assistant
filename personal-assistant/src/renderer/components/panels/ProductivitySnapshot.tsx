import type { Note } from "../../../shared/types";

type Props = {
  notesCount: number;
  pendingRemindersCount: number;
  todayAgendaCount: number;
  recentNotes: Note[];
};

export function ProductivitySnapshot({ notesCount, pendingRemindersCount, todayAgendaCount, recentNotes }: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Productivity Snapshot</h2>
        <span className="pill graphitePill">At a glance</span>
      </div>
      <div className="snapshotGrid">
        <div className="snapshotCard">
          <p className="snapshotLabel">Total notes</p>
          <p className="snapshotValue">{notesCount}</p>
        </div>
        <div className="snapshotCard">
          <p className="snapshotLabel">Pending reminders</p>
          <p className="snapshotValue">{pendingRemindersCount}</p>
        </div>
        <div className="snapshotCard">
          <p className="snapshotLabel">Today agenda</p>
          <p className="snapshotValue">{todayAgendaCount}</p>
        </div>
      </div>
      <h3 className="subheading">Recent notes</h3>
      <ul className="list">
        {recentNotes.length ? (
          recentNotes.map((n) => (
            <li key={n.id}>
              {n.title} - {n.content || "No content"}
            </li>
          ))
        ) : (
          <li className="muted">No notes yet.</li>
        )}
      </ul>
    </section>
  );
}
