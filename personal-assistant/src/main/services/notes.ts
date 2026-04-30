import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { Note } from "../../shared/types";

export function listNotes(query?: string): Note[] {
  const db = getDb();
  const normalizedQuery = typeof query === "string" ? query.trim() : "";
  if (!normalizedQuery) {
    return db.prepare("SELECT * FROM notes ORDER BY pinned DESC, updatedAt DESC").all().map(mapNote);
  }
  return db
    .prepare(
      "SELECT * FROM notes WHERE title LIKE @q OR content LIKE @q ORDER BY pinned DESC, updatedAt DESC"
    )
    .all({ q: `%${normalizedQuery}%` })
    .map(mapNote);
}

export function createNote(input: Pick<Note, "title" | "content" | "tags" | "pinned">): Note {
  const db = getDb();
  const now = new Date().toISOString();
  const title = normalizeText(input.title, "Note title");
  const content = normalizeText(input.content, "Note content");
  const tags = normalizeTags(input.tags);
  const pinned = Boolean(input.pinned);
  const note: Note = { id: randomUUID(), createdAt: now, updatedAt: now, title, content, tags, pinned };
  db.prepare(
    "INSERT INTO notes (id, title, content, tags, pinned, createdAt, updatedAt) VALUES (@id,@title,@content,@tags,@pinned,@createdAt,@updatedAt)"
  ).run({ ...note, tags: JSON.stringify(note.tags), pinned: note.pinned ? 1 : 0 });
  return note;
}

export function deleteNote(id: string): void {
  getDb().prepare("DELETE FROM notes WHERE id=@id").run({ id });
}

function mapNote(row: any): Note {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((tag) => typeof tag === "string");
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags,
    pinned: Boolean(row.pinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function normalizeText(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 50);
}
