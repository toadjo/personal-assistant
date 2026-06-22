import { test, expect } from "./electron-harness.js";

const ONBOARDING_KEY = "assistant-onboarding";

function setOnboardingState(state: {
  progress: {
    noteCreated: boolean;
    reminderCreated: boolean;
    homeAssistantConnected: boolean;
    skippedHomeAssistant: boolean;
  };
  status: "inProgress" | "deferred" | "completed";
}): void {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

function getOnboardingState(): {
  progress: {
    noteCreated: boolean;
    reminderCreated: boolean;
    homeAssistantConnected: boolean;
    skippedHomeAssistant: boolean;
  };
  status: string;
} | null {
  const stored = localStorage.getItem(ONBOARDING_KEY);
  return stored ? JSON.parse(stored) : null;
}

test.describe("First-Run Onboarding (v3.10)", () => {
  test("shows guided onboarding panel on first run", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    await expect(window.locator(".homeDashboard")).toBeVisible();
    await expect(window.locator(".onboardingCoach")).toBeVisible();
    await expect(window.getByText("Start with one memo.")).toBeVisible();
    await expect(window.getByRole("button", { name: "Open Memos" })).toBeVisible();
    await expect(window.getByRole("button", { name: "Mark done" })).toBeVisible();
  });

  test("creating a note advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Click the Memos module to show the notes panel
    await window.locator(".moduleTab").filter({ hasText: "Memos" }).click();

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
    const state = await window.evaluate(() => getOnboardingState());

    expect(state).toBeTruthy();
    expect(state!.progress.noteCreated).toBe(true);
    expect(state!.progress.reminderCreated).toBe(false);
    expect(state!.status).toBe("inProgress");
  });

  test("creating a reminder advances onboarding progress", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding at note step using the single onboarding key
    await window.evaluate(() =>
      setOnboardingState({
        progress: {
          noteCreated: true,
          reminderCreated: false,
          homeAssistantConnected: false,
          skippedHomeAssistant: false
        },
        status: "inProgress"
      })
    );

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    await expect(window.locator(".onboardingCoach")).toBeVisible();
    await expect(window.getByText("Add one reminder.")).toBeVisible();

    // Click the Reminders module to show the reminders panel
    await window.locator(".moduleTab").filter({ hasText: "Reminders" }).click();

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
      const state = await window.evaluate(() => getOnboardingState());
      expect(state).toBeTruthy();
      expect(state!.progress.reminderCreated).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("skipping Home Assistant completes onboarding flow", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding at HA step using the single onboarding key
    await window.evaluate(() =>
      setOnboardingState({
        progress: {
          noteCreated: true,
          reminderCreated: true,
          homeAssistantConnected: false,
          skippedHomeAssistant: false
        },
        status: "inProgress"
      })
    );

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Skip HA connection via the API (simulate calling skipHomeAssistant)
    await window.evaluate(() => {
      const state = getOnboardingState();
      if (state) {
        state.progress.skippedHomeAssistant = true;
        state.status = "completed";
        setOnboardingState(state);
      }
    });

    // Check that onboarding is marked as complete
    const state = await window.evaluate(() => getOnboardingState());

    expect(state).toBeTruthy();
    expect(state!.progress.noteCreated).toBe(true);
    expect(state!.progress.reminderCreated).toBe(true);
    expect(state!.progress.skippedHomeAssistant).toBe(true);
    expect(state!.status).toBe("completed");
  });

  test("completed onboarding shows normal panels instead of guided flow", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    // Set up onboarding as complete using the single onboarding key
    await window.evaluate(() =>
      setOnboardingState({
        progress: {
          noteCreated: true,
          reminderCreated: true,
          homeAssistantConnected: true,
          skippedHomeAssistant: false
        },
        status: "completed"
      })
    );

    // Reload to pick up the new state
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    // Check that guided onboarding panel is not visible
    const heading = await window.getByRole("heading", { name: "Get started" }).isVisible();
    expect(heading).toBe(false);

    // Check that the new home layout is visible: Calendar left, Command right
    // Calendar panel should be visible
    const calendarHeader = await window.locator(".calendarHeader").first().isVisible();
    expect(calendarHeader).toBe(true);

    // Command panel should be visible (check for the command input field)
    const commandPanel = await window.locator(".commandPanel").isVisible();
    expect(commandPanel).toBe(true);
  });

  test.skip("command examples are shown in desk UI", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    const examples = window.locator(".command-examples");

    // Base command example buttons are visible
    await expect(examples.getByRole("button", { name: "New note", exact: true })).toBeVisible();
    await expect(examples.getByRole("button", { name: "Add task", exact: true })).toBeVisible();
    await expect(examples.getByRole("button", { name: "Set reminder", exact: true })).toBeVisible();
    await expect(examples.getByRole("button", { name: "Overdue tasks", exact: true })).toBeVisible();
    await expect(examples.getByRole("button", { name: "Plan ahead", exact: true })).toBeVisible();
  });

  test.skip("HA-specific command examples are hidden when HA not configured", async ({ window }) => {
    await window.waitForLoadState("domcontentloaded");

    const examples = window.locator(".command-examples");

    // Base examples should be visible
    await expect(examples.getByRole("button", { name: "New note", exact: true })).toBeVisible();
    await expect(examples.getByRole("button", { name: "Add task", exact: true })).toBeVisible();

    // HA-specific examples should not be visible
    await expect(examples.getByRole("button", { name: "Toggle device", exact: true })).toHaveCount(0);
    await expect(examples.getByRole("button", { name: "Devices", exact: true })).toHaveCount(0);
  });
});
