/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "./electron-harness";

test.describe("IPC Validation Errors", () => {
  test("invalid quick note payload shows stable validation copy", async ({ window }) => {
    // Wait for the app to load
    await window.waitForLoadState("networkidle");

    // Try to create a note with an empty title (invalid per schema)
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.createNote({
          title: "", // Invalid: title must be min 1 char
          content: "Some content",
          tags: [],
          pinned: false
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    // Should show the stable validation message, not raw Zod output
    expect(error).toContain("That request had invalid data");
    expect(error).toContain("title");
  });

  test("invalid reminder datetime payload shows stable validation copy", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to create a reminder with an invalid datetime
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.createReminder({
          text: "Test reminder",
          dueAt: "not-a-valid-datetime", // Invalid: must be ISO datetime
          recurrence: "none"
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("That request had invalid data");
    expect(error).toContain("date and time");
  });

  test("invalid Home Assistant config field shows field-specific hint", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Try to configure HA with an empty URL
    const error = await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      try {
        await api.configureHomeAssistant({
          url: "", // Invalid: URL must be min 1 char
          token: "some-token"
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toBeTruthy();
    expect(error).toContain("Home Assistant URL is required");
  });
});
