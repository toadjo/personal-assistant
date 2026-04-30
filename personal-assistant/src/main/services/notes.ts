import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { Note } from "../../shared/types";

export function listNotes(query?: string): Note[] {
  const db = getDb();
  if (!query) {
    return db.prepare("SELECT * FROM notes ORDER BY pinned DESC, updatedAt DESC").all().map(mapNote);
  }
  return db
    .prepare(
      "SELECT * FROM notes WHERE title LIKE @q OR content LIKE @q ORDER BY pinned DESC, updatedAt DESC"
    )
    .all({ q: `%${query}%` })
    .map(mapNote);
}

export function createNote(input: Pick<Note, "title" | "content" | "tags" | "pinned">): Note {
  const db = getDb();
  const now = new Date().toISOString();
  const note: Note = { id: randomUUID(), createdAt: now, updatedAt: now, ...input };
  db.prepare(
    "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id,@title,@content,@tags,@pinned,@createdAt,@updatedAt)"
  ).run({ ...note, tags: JSON.stringify(note.tags), pinned: note.pinned ? 1 : 0 });
  return note;
}

function mapNote(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags),
    pinned: Boolean(row.pinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
