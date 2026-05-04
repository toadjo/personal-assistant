/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "./electron-harness";

test.describe("Structured Non-Retryable Failures", () => {
  test("delete missing rule shows automation-domain message", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to delete a non-existent rule
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.deleteRule("00000000-0000-0000-0000-000000000000");
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the automation-domain message
    expect(error).toContain("automation");
    // Non-retryable errors should not have retry hint
    expect(error).not.toContain("You can try again");
  });

  test("complete missing reminder shows reminder-domain message", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to complete a non-existent reminder
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.completeReminder("00000000-0000-0000-0000-000000000000");
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the reminder-domain message
    expect(error).toContain("reminder");
    expect(error).toContain("not found");
    // Non-retryable errors should not have retry hint
    expect(error).not.toContain("You can try again");
  });

  test("delete missing reminder shows reminder-domain message", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to delete a non-existent reminder
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.deleteReminder("00000000-0000-0000-0000-000000000000");
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the reminder-domain message
    expect(error).toContain("reminder");
    expect(error).toContain("not found");
    // Non-retryable errors should not have retry hint
    expect(error).not.toContain("You can try again");
  });

  test("delete missing note shows notes-domain message", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to delete a non-existent note
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.deleteNote("00000000-0000-0000-0000-000000000000");
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the notes-domain message
    expect(error).toContain("note");
    expect(error).toContain("not found");
    // Non-retryable errors should not have retry hint
    expect(error).not.toContain("You can try again");
  });

  test("edit missing note shows notes-domain message", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to update a non-existent note
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.updateNote({
          id: "00000000-0000-0000-0000-000000000000",
          title: "Updated title"
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the notes-domain message
    expect(error).toContain("note");
    expect(error).toContain("not found");
    // Non-retryable errors should not have retry hint
    expect(error).not.toContain("You can try again");
  });
});
