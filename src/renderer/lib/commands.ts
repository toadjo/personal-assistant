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

export function normalizeCommandAlias(input: string): string {
  const lower = input.trim().toLowerCase();
  if (lower === "today" || lower === "what's next" || lower === "whats next") {
    return "list reminders";
  }
  return input.trim();
}
