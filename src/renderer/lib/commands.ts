export function parseReminderCommand(raw: string): { text: string; dueAt: string } {
  const body = raw.replace(/^remind\s+/i, "").trim();
  const match = body.match(/^(.*)\s+in\s+(\d+)\s*([mh])$/i);
  if (!match) {
    throw new Error("Use: remind <text> in <number><m|h>. Example: remind call mom in 15m");
  }
  const text = match[1]!.trim();
  const amount = Number(match[2]!);
  const unit = match[3]!.toLowerCase();
  const minutes = unit === "h" ? amount * 60 : amount;
  if (!text) throw new Error("Reminder text is required.");
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Reminder time must be positive.");
  const dueAtMs = Date.now() + minutes * 60_000;
  if (!Number.isFinite(dueAtMs)) {
    throw new Error("Reminder time is too large. Use a smaller value.");
  }
  const dueAt = new Date(dueAtMs);
  if (!Number.isFinite(dueAt.getTime())) {
    throw new Error("Reminder time is out of supported range.");
  }
  return { text, dueAt: dueAt.toISOString() };
}

export function parseReminderMeCommand(raw: string): { text: string; dueAt: string } {
  const body = raw.replace(/^remind me to\s+/i, "").trim();
  const match = body.match(/^(.*)\s+in\s+(\d+)\s*([mh])$/i);
  if (!match) throw new Error("Try: remind me to call mom in 15m");
  const text = match[1]!.trim();
  const amount = Number(match[2]!);
  const unit = match[3]!.toLowerCase();
  const minutes = unit === "h" ? amount * 60 : amount;
  if (!text) throw new Error("Reminder text is required.");
  const dueAtMs = Date.now() + minutes * 60_000;
  return { text, dueAt: new Date(dueAtMs).toISOString() };
}

export function parseNoteAlias(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith("make a note ")) return raw.replace(/^make a note\s+/i, "").trim();
  if (lower.startsWith("add note ")) return raw.replace(/^add note\s+/i, "").trim();
  if (lower.startsWith("remember ")) return raw.replace(/^remember\s+/i, "").trim();
  if (lower.startsWith("new note ")) return raw.replace(/^new note\s+/i, "").trim();
  if (lower.startsWith("note ")) return raw.replace(/^note\s+/i, "").trim();
  return raw;
}

export function normalizeCommandAlias(input: string): string {
  const lower = input.trim().toLowerCase();
  if (lower === "today" || lower === "what's next" || lower === "whats next") return "list reminders";
  if (lower === "show reminders") return "list reminders";
  if (lower === "show notes") return "clear notes search";
  if (lower === "open home") return "open household";
  return input.trim();
}
