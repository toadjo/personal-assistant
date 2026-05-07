import type { Task } from "../../shared/types";
import type { BrowserWindow } from "electron";
import { Notification } from "electron";
import { getDb } from "../db";
import { mainLog } from "../log";
import { showMainWindow } from "../window";

export function listTasks(query?: string): Task[] {
  const db = getDb();
  if (!query) {
    const rows = db.prepare("SELECT * FROM tasks ORDER BY createdAt DESC").all() as Task[];
    return rows;
  }
  const rows = db
    .prepare("SELECT * FROM tasks WHERE title LIKE ? OR notes LIKE ? ORDER BY createdAt DESC")
    .all(`%${query}%`, `%${query}%`) as Task[];
  return rows;
}

export function listOverdueOpenTasks(nowIso = new Date().toISOString()): Task[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM tasks WHERE status = 'open' AND dueAt IS NOT NULL AND dueAt <= ? ORDER BY dueAt ASC")
    .all(nowIso) as Task[];
}

export function createTask(payload: {
  title: string;
  notes: string;
  dueAt: string | null;
  priority: "low" | "normal" | "high";
  recurrence: "none" | "daily" | "weekly" | "monthly";
}): Task {
  assertRecurrenceHasDueAt(payload.recurrence, payload.dueAt);
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, notes, dueAt, priority, status, recurrence, notifyChannel, createdAt, updatedAt, lastCompletedAt)
    VALUES (@id, @title, @notes, @dueAt, @priority, @status, @recurrence, @notifyChannel, @createdAt, @updatedAt, @lastCompletedAt)
  `);
  stmt.run({
    id,
    title: payload.title,
    notes: payload.notes,
    dueAt: payload.dueAt,
    priority: payload.priority,
    status: "open",
    recurrence: payload.recurrence,
    notifyChannel: "desktop",
    createdAt: now,
    updatedAt: now,
    lastCompletedAt: null
  });
  return getTaskById(id)!;
}

export function updateTask(payload: {
  id: string;
  title?: string;
  notes?: string;
  dueAt?: string | null;
  priority?: "low" | "normal" | "high";
  status?: "open" | "done";
  recurrence?: "none" | "daily" | "weekly" | "monthly";
}): Task {
  const db = getDb();
  const existing = getTaskById(payload.id);
  if (!existing) {
    throw new Error(`Task not found: ${payload.id}`);
  }
  const nextRecurrence = payload.recurrence ?? existing.recurrence;
  const nextDueAt = payload.dueAt !== undefined ? payload.dueAt : existing.dueAt;
  assertRecurrenceHasDueAt(nextRecurrence, nextDueAt);
  const updates: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.title !== undefined) {
    updates.push("title = @title");
    params.title = payload.title;
  }
  if (payload.notes !== undefined) {
    updates.push("notes = @notes");
    params.notes = payload.notes;
  }
  if (payload.dueAt !== undefined) {
    updates.push("dueAt = @dueAt");
    params.dueAt = payload.dueAt;
  }
  if (payload.priority !== undefined) {
    updates.push("priority = @priority");
    params.priority = payload.priority;
  }
  if (payload.status !== undefined) {
    updates.push("status = @status");
    params.status = payload.status;
  }
  if (payload.recurrence !== undefined) {
    updates.push("recurrence = @recurrence");
    params.recurrence = payload.recurrence;
  }

  updates.push("updatedAt = @updatedAt");
  params.updatedAt = new Date().toISOString();

  const sql = `UPDATE tasks SET ${updates.join(", ")} WHERE id = @id`;
  db.prepare(sql).run(params);
  return getTaskById(payload.id)!;
}

export function completeTask(id: string): Task {
  const db = getDb();
  const task = getTaskById(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  if (task.recurrence === "none") {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE tasks
      SET status = @status, lastCompletedAt = @lastCompletedAt, updatedAt = @updatedAt
      WHERE id = @id
    `);
    stmt.run({
      id,
      status: "done",
      lastCompletedAt: now,
      updatedAt: now
    });
    return getTaskById(id)!;
  }

  // For recurring tasks, advance dueAt and keep status open
  assertRecurrenceHasDueAt(task.recurrence, task.dueAt);
  const nextDueAt = advanceDueDate(task.dueAt, task.recurrence, true);
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE tasks
    SET dueAt = @dueAt, status = @status, lastCompletedAt = @lastCompletedAt, updatedAt = @updatedAt
    WHERE id = @id
  `);
  stmt.run({
    id,
    dueAt: nextDueAt,
    status: "open",
    lastCompletedAt: now,
    updatedAt: now
  });
  return getTaskById(id)!;
}

export function deleteTask(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

function getTaskById(id: string): Task | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
  return row ?? null;
}

function assertRecurrenceHasDueAt(recurrence: "none" | "daily" | "weekly" | "monthly", dueAt: string | null): void {
  if (recurrence !== "none" && !dueAt) {
    throw new Error("Recurring tasks require dueAt.");
  }
}

function advanceDueDate(
  currentDueAt: string | null,
  recurrence: "daily" | "weekly" | "monthly",
  untilFuture = false
): string {
  if (!currentDueAt) {
    const now = new Date();
    if (recurrence === "daily") {
      now.setDate(now.getDate() + 1);
    } else if (recurrence === "weekly") {
      now.setDate(now.getDate() + 7);
    } else if (recurrence === "monthly") {
      now.setMonth(now.getMonth() + 1);
    }
    if (!untilFuture) return now.toISOString();
    while (now.getTime() <= Date.now()) {
      if (recurrence === "daily") now.setDate(now.getDate() + 1);
      if (recurrence === "weekly") now.setDate(now.getDate() + 7);
      if (recurrence === "monthly") now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  }

  const date = new Date(currentDueAt);
  if (recurrence === "daily") {
    date.setDate(date.getDate() + 1);
  } else if (recurrence === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === "monthly") {
    date.setMonth(date.getMonth() + 1);
  }
  if (untilFuture) {
    while (date.getTime() <= Date.now()) {
      if (recurrence === "daily") date.setDate(date.getDate() + 1);
      if (recurrence === "weekly") date.setDate(date.getDate() + 7);
      if (recurrence === "monthly") date.setMonth(date.getMonth() + 1);
    }
  }
  return date.toISOString();
}

const TASK_SCHEDULER_INTERVAL_MS = 60_000;

export function startTaskScheduler(getWindows: () => readonly (BrowserWindow | null)[]): { stop: () => void } {
  const alreadyNotified = new Set<string>();

  const runTick = (): void => {
    const due = listOverdueOpenTasks();
    const dueIds = new Set(due.map((task) => task.id));
    for (const id of [...alreadyNotified]) {
      if (!dueIds.has(id)) alreadyNotified.delete(id);
    }

    for (const task of due) {
      if (alreadyNotified.has(task.id)) continue;
      alreadyNotified.add(task.id);
      const notification = new Notification({
        title: "Task due",
        body: task.title
      });
      notification.on("click", () => {
        for (const w of getWindows()) {
          if (w && !w.isDestroyed()) {
            showMainWindow(w);
            break;
          }
        }
      });
      notification.show();
    }
    if (due.length > 0) {
      mainLog.info(`[scheduler:tasks] due=${due.length} notified=${alreadyNotified.size}`);
    }
  };

  runTick();
  const timer = setInterval(runTick, TASK_SCHEDULER_INTERVAL_MS);
  timer.unref();

  return {
    stop: () => {
      clearInterval(timer);
      mainLog.info("[scheduler:tasks] stopped");
    }
  };
}
