import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createMemoryDatabase } from "../test/memoryDb";

let testDb: Database.Database;

vi.mock("../db", () => ({
  getDb: () => testDb
}));

vi.mock("../window", () => ({
  showMainWindow: vi.fn()
}));

const showNotificationSafeMock = vi.fn();

vi.mock("../notification", () => ({
  showNotificationSafe: (...args: unknown[]) => showNotificationSafeMock(...args)
}));

vi.mock("../log", () => ({
  mainLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { decodeAssistantInvokeFailure } from "../../shared/invokeErrors";
import {
  completeReminder,
  createReminder,
  deleteReminder,
  listReminders,
  snoozeReminder,
  runReminderSchedulerTick,
  updateReminder
} from "./reminders";
import type { NotificationResult } from "../notification";

describe("reminders service", () => {
  beforeEach(() => {
    testDb = createMemoryDatabase();
    showNotificationSafeMock.mockReset();
  });

  afterEach(() => {
    testDb?.close();
  });

  it("create list complete delete flow", () => {
    const due = new Date(Date.now() + 60_000).toISOString();
    const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
    expect(listReminders().find((x) => x.id === r.id)?.text).toBe("Buy milk");
    completeReminder(r.id);
    expect(listReminders().find((x) => x.id === r.id)?.status).toBe("done");
    deleteReminder(r.id);
    expect(listReminders().find((x) => x.id === r.id)).toBeUndefined();
  });

  it("snoozeReminder advances pending dueAt", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const r = createReminder({ text: "Wake", dueAt: past, recurrence: "none" });
    snoozeReminder(r.id, 5);
    const updated = listReminders().find((x) => x.id === r.id);
    expect(updated?.status).toBe("pending");
    expect(new Date(updated!.dueAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("snoozeReminder rejects invalid minutes", () => {
    const r = createReminder({
      text: "x",
      dueAt: new Date(Date.now() + 120_000).toISOString(),
      recurrence: "none"
    });
    expect(() => snoozeReminder(r.id, 0)).toThrow();
    expect(() => snoozeReminder(r.id, 999999)).toThrow();
  });

  it("completeReminder surfaces REMINDER_NOT_FOUND for unknown ids", () => {
    try {
      completeReminder("00000000-0000-4000-8000-000000000099");
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "reminders",
        code: "REMINDER_NOT_FOUND",
        retryable: false
      });
    }
  });

  it("snoozeReminder surfaces INVALID_REMINDER_OPERATION for invalid minutes", () => {
    const r = createReminder({
      text: "x",
      dueAt: new Date(Date.now() + 120_000).toISOString(),
      recurrence: "none"
    });
    try {
      snoozeReminder(r.id, 0);
      expect.fail("expected throw");
    } catch (e) {
      expect(decodeAssistantInvokeFailure(e)).toMatchObject({
        domain: "reminders",
        code: "INVALID_REMINDER_OPERATION",
        retryable: false
      });
    }
  });

  describe("updateReminder", () => {
    it("updates reminder text successfully", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      updateReminder(r.id, { text: "Buy bread" });
      const updated = listReminders().find((x) => x.id === r.id);
      expect(updated?.text).toBe("Buy bread");
      expect(updated?.dueAt).toBe(due);
    });

    it("updates reminder due date successfully", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      const newDue = new Date(Date.now() + 120_000).toISOString();
      updateReminder(r.id, { dueAt: newDue });
      const updated = listReminders().find((x) => x.id === r.id);
      expect(updated?.text).toBe("Buy milk");
      expect(updated?.dueAt).toBe(newDue);
    });

    it("updates both text and due date successfully", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      const newDue = new Date(Date.now() + 120_000).toISOString();
      updateReminder(r.id, { text: "Buy bread", dueAt: newDue });
      const updated = listReminders().find((x) => x.id === r.id);
      expect(updated?.text).toBe("Buy bread");
      expect(updated?.dueAt).toBe(newDue);
    });

    it("rejects empty text", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      try {
        updateReminder(r.id, { text: "" });
        expect.fail("expected throw");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toContain("required");
      }
    });

    it("rejects invalid due date", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      try {
        updateReminder(r.id, { dueAt: "invalid-date" });
        expect.fail("expected throw");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toContain("valid ISO date");
      }
    });

    it("rejects updates with no fields", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Buy milk", dueAt: due, recurrence: "none" });
      try {
        updateReminder(r.id, {});
        expect.fail("expected throw");
      } catch (e) {
        expect(decodeAssistantInvokeFailure(e)).toMatchObject({
          domain: "reminders",
          code: "INVALID_REMINDER_OPERATION",
          retryable: false
        });
      }
    });

    it("surfaces REMINDER_NOT_FOUND for unknown ids", () => {
      try {
        updateReminder("00000000-0000-4000-8000-000000000099", { text: "Test" });
        expect.fail("expected throw");
      } catch (e) {
        expect(decodeAssistantInvokeFailure(e)).toMatchObject({
          domain: "reminders",
          code: "REMINDER_NOT_FOUND",
          retryable: false
        });
      }
    });

    it("preserves recurrence, status, and notifyChannel", () => {
      const due = new Date(Date.now() + 60_000).toISOString();
      const r = createReminder({ text: "Daily pill", dueAt: due, recurrence: "daily" });
      updateReminder(r.id, { text: "Daily vitamin" });
      const updated = listReminders().find((x) => x.id === r.id);
      expect(updated?.text).toBe("Daily vitamin");
      expect(updated?.recurrence).toBe("daily");
      expect(updated?.status).toBe("pending");
      expect(updated?.notifyChannel).toBe("desktop");
    });
  });

  describe("scheduler notification reliability", () => {
    it("keeps one-time reminder pending when notification fails", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      createReminder({ text: "Buy milk", dueAt: past, recurrence: "none" });
      showNotificationSafeMock.mockReturnValue("failed" as NotificationResult);

      runReminderSchedulerTick(() => []);

      const reminders = listReminders();
      expect(reminders.length).toBe(1);
      expect(reminders[0]?.status).toBe("pending");
      expect(reminders[0]?.dueAt).toBe(past);
    });

    it("completes one-time reminder when notification succeeds", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      createReminder({ text: "Buy milk", dueAt: past, recurrence: "none" });
      showNotificationSafeMock.mockReturnValue("shown" as NotificationResult);

      runReminderSchedulerTick(() => []);

      const reminders = listReminders();
      expect(reminders.length).toBe(1);
      expect(reminders[0]?.status).toBe("done");
    });

    it("advances recurring reminder when notification succeeds", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      createReminder({ text: "Daily pill", dueAt: past, recurrence: "daily" });
      showNotificationSafeMock.mockReturnValue("shown" as NotificationResult);

      runReminderSchedulerTick(() => []);

      const reminders = listReminders();
      expect(reminders.length).toBe(1);
      expect(reminders[0]?.status).toBe("pending");
      expect(new Date(reminders[0]!.dueAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("keeps recurring reminder pending when notification fails", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      createReminder({ text: "Daily pill", dueAt: past, recurrence: "daily" });
      showNotificationSafeMock.mockReturnValue("failed" as NotificationResult);

      runReminderSchedulerTick(() => []);

      const reminders = listReminders();
      expect(reminders.length).toBe(1);
      expect(reminders[0]?.status).toBe("pending");
      expect(reminders[0]?.dueAt).toBe(past);
    });

    it("does not tight-loop on repeated notification failures (cooldown)", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      createReminder({ text: "Buy milk", dueAt: past, recurrence: "none" });
      showNotificationSafeMock.mockReturnValue("failed" as NotificationResult);

      runReminderSchedulerTick(() => []);
      const callCount1 = showNotificationSafeMock.mock.calls.length;

      runReminderSchedulerTick(() => []);
      const callCount2 = showNotificationSafeMock.mock.calls.length;

      // Should not call again due to cooldown
      expect(callCount2).toBe(callCount1);
    });
  });
});
