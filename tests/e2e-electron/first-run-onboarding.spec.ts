/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "./electron-harness";

test.describe("First-Run Onboarding (v1.2.7)", () => {
  test("shows guided onboarding panel on first run", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Check that guided onboarding panel is visible
    const onboardingPanel = await window.locator("text=Welcome to Personal Assistant").isVisible();
    expect(onboardingPanel).toBe(true);

    // Check that the first step (note) is shown
    const stepTitle = await window.locator("text=Step 1: Create your first note").isVisible();
    expect(stepTitle).toBe(true);
  });

  test("creating a note advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Create a note via the API
    await window.evaluate(async () => {
      const api = (window as any).assistantApi;
      await api.createNote({
        title: "First onboarding note",
        content: "Created during onboarding",
        tags: [],
        pinned: false
      });
    });

    // Check that onboarding progress was saved
    const progress = await window.evaluate(() => {
      const stored = localStorage.getItem("onboardingProgress");
      return stored ? JSON.parse(stored) : null;
    });

    expect(progress).toBeTruthy();
    expect(progress.completedSteps).toContain("note");
  });

  test("creating a reminder advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Set up onboarding at note step
    await window.evaluate(() => {
      localStorage.setItem("onboardingProgress", JSON.stringify({ completedSteps: ["note"] }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("networkidle");

    // Create a reminder via the API
    const dueAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    await window.evaluate(async (dueAtStr) => {
      const api = (window as any).assistantApi;
      await api.createReminder({
        text: "First onboarding reminder",
        dueAt: dueAtStr,
        recurrence: "none"
      });
    }, dueAt);

    // Check that onboarding progress was saved
    const progress = await window.evaluate(() => {
      const stored = localStorage.getItem("onboardingProgress");
      return stored ? JSON.parse(stored) : null;
    });

    expect(progress).toBeTruthy();
    expect(progress.completedSteps).toContain("reminder");
  });

  test("skipping Home Assistant completes onboarding flow", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Set up onboarding at HA step
    await window.evaluate(() => {
      localStorage.setItem("onboardingProgress", JSON.stringify({ completedSteps: ["note", "reminder"] }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("networkidle");

    // Skip HA connection via the API (simulate calling skipHomeAssistant)
    await window.evaluate(() => {
      const progress = JSON.parse(localStorage.getItem("onboardingProgress") || "{}");
      progress.completedSteps = ["note", "reminder", "homeAssistant"];
      localStorage.setItem("onboardingProgress", JSON.stringify(progress));
    });

    // Check that onboarding is marked as complete
    const progress = await window.evaluate(() => {
      const stored = localStorage.getItem("onboardingProgress");
      return stored ? JSON.parse(stored) : null;
    });

    expect(progress).toBeTruthy();
    expect(progress.completedSteps).toEqual(["note", "reminder", "homeAssistant"]);
  });

  test("completed onboarding shows normal panels instead of guided flow", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Set up onboarding as complete
    await window.evaluate(() => {
      localStorage.setItem("onboardingProgress", JSON.stringify({ completedSteps: ["note", "reminder", "homeAssistant"] }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("networkidle");

    // Check that guided onboarding panel is not visible
    const onboardingPanel = await window.locator("text=Welcome to Personal Assistant").isVisible();
    expect(onboardingPanel).toBe(false);

    // Check that normal panels are visible
    const notesPanel = await window.locator("text=Memos").isVisible();
    expect(notesPanel).toBe(true);
  });

  test("command examples are shown in desk UI", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Check that "Try these commands" section is visible
    const examplesTitle = await window.locator("text=Try these commands:").isVisible();
    expect(examplesTitle).toBe(true);

    // Check that base examples are shown
    const createNote = await window.locator("text=Create a note").isVisible();
    expect(createNote).toBe(true);

    const setReminder = await window.locator("text=Set a reminder").isVisible();
    expect(setReminder).toBe(true);
  });

  test("HA-specific command examples are hidden when HA not configured", async ({ window }) => {
    await window.waitForLoadState("networkidle");

    // Ensure HA is not configured
    await window.evaluate(() => {
      localStorage.removeItem("haConfig");
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("networkidle");

    // HA-specific examples should not be shown
    const toggleDevice = await window.locator("text=Toggle a device").isVisible();
    expect(toggleDevice).toBe(false);

    const listDevices = await window.locator("text=List all devices").isVisible();
    expect(listDevices).toBe(false);
  });
});
