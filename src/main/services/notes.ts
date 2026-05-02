import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { Note } from "../../shared/types";

export function listNotes(query?: string): Note[] {
  const db = getDb();
  const normalizedQuery = typeof query === "string" ? query.trim() : "";
  if (!normalizedQuery) {
    return db
      .prepare("SELECT * FROM notes ORDER BY pinned DESC, updatedAt DESC")
      .all()
      .map((row) => mapNote(row as Record<string, unknown>));
  }
  return db
    .prepare("SELECT * FROM notes WHERE title LIKE @q OR content LIKE @q ORDER BY pinned DESC, updatedAt DESC")
    .all({ q: `%${normalizedQuery}%` })
    .map((row) => mapNote(row as Record<string, unknown>));
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

export function updateNote(input: {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
}): Note {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM notes WHERE id=@id").get({ id: input.id }) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error("Note not found.");
  }
  const current = mapNote(existing);
  const title = input.title !== undefined ? normalizeText(input.title, "Note title") : current.title;
  const content = input.content !== undefined ? normalizeText(input.content, "Note content") : current.content;
  const tags = input.tags !== undefined ? normalizeTags(input.tags) : current.tags;
  const pinned = input.pinned !== undefined ? Boolean(input.pinned) : current.pinned;
  const updatedAt = new Date().toISOString();
  const note: Note = {
    id: current.id,
    title,
    content,
    tags,
    pinned,
    createdAt: current.createdAt,
    updatedAt
  };
  db.prepare(
    "UPDATE notes SET title=@title, content=@content, tags=@tags, pinned=@pinned, updatedAt=@updatedAt WHERE id=@id"
  ).run({
    ...note,
    tags: JSON.stringify(note.tags),
    pinned: note.pinned ? 1 : 0
  });
  return note;
}

function mapNote(row: Record<string, unknown>): Note {
  const id = typeof row?.id === "string" && row.id.trim() ? row.id.trim() : "";
  if (!id) {
    throw new Error("Note row is missing a valid id (database may be corrupted).");
  }
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(typeof row.tags === "string" ? row.tags : "[]");
    if (Array.isArray(parsed)) tags = parsed.filter((tag) => typeof tag === "string");
  } catch {
    tags = [];
  }
  const nowIso = new Date().toISOString();
  const safeTitle = normalizeOptionalText(row?.title, "Untitled note");
  const safeContent = normalizeOptionalText(row?.content, "");
  return {
    id,
    title: safeTitle,
    content: safeContent,
    tags,
    pinned: Boolean(row.pinned),
    createdAt: normalizeIsoDateOrFallback(row?.createdAt, nowIso),
    updatedAt: normalizeIsoDateOrFallback(row?.updatedAt, nowIso)
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
    .slice(0, 25);
}

function normalizeOptionalText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function normalizeIsoDateOrFallback(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return date.toISOString();
}
