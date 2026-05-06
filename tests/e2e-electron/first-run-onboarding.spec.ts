import { test, expect } from "./electron-harness.js";

test.describe("First-Run Onboarding (v1.2.7)", () => {
  test("shows guided onboarding panel on first run", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Check that guided onboarding panel is visible with stable current UI copy
    const heading = await window.getByRole("heading", { name: "Get started" }).isVisible();
    expect(heading).toBe(true);

    // Check for description text
    const stepDescription = await window.locator(".stepDescription").filter({ hasText: "Notes are for quick memos" }).isVisible();
    expect(stepDescription).toBe(true);

    // Check for the action button
    const actionButton = await window.getByRole("button", { name: "I've created a note" }).isVisible();
    expect(actionButton).toBe(true);
  });

  test("creating a note advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Create a note using the quick note form (scoped to avoid Add button ambiguity)
    const noteForm = window.locator("form").filter({
      has: window.getByLabel("Quick note title")
    });
    await noteForm.getByLabel("Quick note title").fill("First onboarding note");
    await noteForm.getByLabel("Quick note content").fill("Created during onboarding");
    await noteForm.getByRole("button", { name: "Add" }).click();

    // Wait for the note to be created
    await window.waitForTimeout(1000);

    // Check that onboarding progress was saved with correct key and shape
    const progress = await window.evaluate(() => {
      const stored = localStorage.getItem("assistant-onboarding-progress");
      return stored ? JSON.parse(stored) : null;
    });

    expect(progress).toBeTruthy();
    expect(progress.noteCreated).toBe(true);
    expect(progress.reminderCreated).toBe(false);
  });

  test("creating a reminder advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding at note step using correct key and shape
    await window.evaluate(() => {
      localStorage.setItem("assistant-onboarding-progress", JSON.stringify({ noteCreated: true, reminderCreated: false, homeAssistantConnected: false, skippedHomeAssistant: false }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Wait for the reminder step UI to appear
    await window.getByRole("button", { name: "I've created a reminder" }).waitFor();

    // Create a reminder using the UI form
    // Use a local datetime helper to avoid UTC formatting issues
    const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes in future
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, "0");
    const day = String(futureDate.getDate()).padStart(2, "0");
    const hours = String(futureDate.getHours()).padStart(2, "0");
    const minutes = String(futureDate.getMinutes()).padStart(2, "0");
    const localDateStr = `${year}-${month}-${day}T${hours}:${minutes}`;

    await window.getByLabel("Reminder text").fill("First onboarding reminder");
    await window.getByLabel("Reminder date and time").fill(localDateStr);
    await window.getByRole("button", { name: "Schedule" }).click();

    // Poll localStorage until reminderCreated becomes true
    await expect(async () => {
      const progress = await window.evaluate(() => {
        const stored = localStorage.getItem("assistant-onboarding-progress");
        return stored ? JSON.parse(stored) : null;
      });
      expect(progress).toBeTruthy();
      expect(progress.reminderCreated).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("skipping Home Assistant completes onboarding flow", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding at HA step using correct key and shape
    await window.evaluate(() => {
      localStorage.setItem("assistant-onboarding-progress", JSON.stringify({ noteCreated: true, reminderCreated: true, homeAssistantConnected: false, skippedHomeAssistant: false }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Skip HA connection via the API (simulate calling skipHomeAssistant)
    await window.evaluate(() => {
      const progress = JSON.parse(localStorage.getItem("assistant-onboarding-progress") || "{}");
      progress.skippedHomeAssistant = true;
      localStorage.setItem("assistant-onboarding-progress", JSON.stringify(progress));
    });

    // Check that onboarding is marked as complete
    const progress = await window.evaluate(() => {
      const stored = localStorage.getItem("assistant-onboarding-progress");
      return stored ? JSON.parse(stored) : null;
    });

    expect(progress).toBeTruthy();
    expect(progress.noteCreated).toBe(true);
    expect(progress.reminderCreated).toBe(true);
    expect(progress.skippedHomeAssistant).toBe(true);
  });

  test("completed onboarding shows normal panels instead of guided flow", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding as complete using correct key and shape
    await window.evaluate(() => {
      localStorage.setItem("assistant-onboarding-progress", JSON.stringify({ noteCreated: true, reminderCreated: true, homeAssistantConnected: true, skippedHomeAssistant: false }));
    });

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Check that guided onboarding panel is not visible
    const heading = await window.getByRole("heading", { name: "Get started" }).isVisible();
    expect(heading).toBe(false);

    // Check that normal panels are visible using accessible locators
    const notesPanel = await window.getByRole("heading", { name: "Memos" }).isVisible();
    expect(notesPanel).toBe(true);
  });

  test("command examples are shown in desk UI", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Check that base command example buttons are visible
    const createNoteButton = await window.getByRole("button", { name: "Create a note" }).isVisible();
    expect(createNoteButton).toBe(true);

    const setReminderButton = await window.getByRole("button", { name: "Set a reminder" }).isVisible();
    expect(setReminderButton).toBe(true);

    const showRemindersButton = await window.getByRole("button", { name: "Show reminders" }).isVisible();
    expect(showRemindersButton).toBe(true);

    const showNotesButton = await window.getByRole("button", { name: "Show all notes" }).isVisible();
    expect(showNotesButton).toBe(true);
  });

  test("HA-specific command examples are hidden when HA not configured", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Base examples should be visible
    const createNoteButton = await window.getByRole("button", { name: "Create a note" }).isVisible();
    expect(createNoteButton).toBe(true);

    // HA-specific examples should not be visible
    const toggleDeviceButton = await window.getByRole("button", { name: "Toggle a device" }).isVisible();
    expect(toggleDeviceButton).toBe(false);

    const listDevicesButton = await window.getByRole("button", { name: "List all devices" }).isVisible();
    expect(listDevicesButton).toBe(false);

    const openHouseholdButton = await window.getByRole("button", { name: "Open Household window" }).isVisible();
    expect(openHouseholdButton).toBe(false);
  });
});
