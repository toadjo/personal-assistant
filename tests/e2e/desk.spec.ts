import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const stubPath = path.join(process.cwd(), "tests", "e2e", "install-assistant-api-stub.js");

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: stubPath });
});

test("desk shell shows assistant command field and home layout", async ({ page }) => {
  await page.goto("/");

  // Verify Home button is active by default
  const homeButton = page.getByRole("button", { name: /^Home$/ }).first();
  await expect(homeButton).toBeVisible();
  await expect(homeButton).toHaveClass(/moduleTabActive/);

  // Verify command field is visible
  await expect(page.getByRole("textbox", { name: /message the assistant/i })).toBeVisible();

  // Verify Calendar is visible in home layout
  await expect(page.getByRole("heading", { name: /^calendar$/i })).toBeVisible();

  // Verify module buttons are visible (target moduleTab class specifically)
  await expect(page.locator(".moduleTab").filter({ hasText: "Today" })).toBeVisible();
  await expect(page.locator(".moduleTab").filter({ hasText: "Inbox" })).toBeVisible();
  await expect(page.locator(".moduleTab").filter({ hasText: "Memos" })).toBeVisible();
  await expect(page.locator(".moduleTab").filter({ hasText: "Reminders" })).toBeVisible();
  await expect(page.locator(".moduleTab").filter({ hasText: "Tasks" })).toBeVisible();
  await expect(page.locator(".moduleTab").filter({ hasText: "Automations" })).toBeVisible();

  // Check accessibility on home layout (non-blocking for now)
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`Accessibility violations found: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation) => {
      console.log(`- ${violation.id}: ${violation.description} (${violation.impact})`);
    });
  }

  // Click Today button and verify it becomes active
  const todayButton = page.locator(".moduleTab").filter({ hasText: "Today" });
  await todayButton.click();
  await expect(todayButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^daily command center$/i })).toBeVisible();

  // Check accessibility on Today view (non-blocking for now)
  const todayAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (todayAccessibilityScanResults.violations.length > 0) {
    console.log(`Today view accessibility violations: ${todayAccessibilityScanResults.violations.length}`);
    todayAccessibilityScanResults.violations.forEach((violation) => {
      console.log(`- ${violation.id}: ${violation.description} (${violation.impact})`);
      violation.nodes.forEach((node) => {
        console.log(`  Target: ${node.target.join(', ')}`);
      });
    });
  }

  // Click Home button to return to dashboard
  await homeButton.click();
  await expect(homeButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^calendar$/i })).toBeVisible();
});

test("household route loads household shell", async ({ page }) => {
  await page.goto("/#household");
  await expect(page.getByRole("heading", { level: 1, name: /^Household$/ })).toBeVisible();
});

test("projects mode renders team task surface and matches snapshot", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Projects$/ }).click();
  await expect(page.getByRole("heading", { name: /^Shared Tasks$/ })).toBeVisible();
  await expect(page.getByText("Design logo")).toBeVisible();
  
  // Check accessibility on projects panel (non-blocking for now)
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`Projects panel accessibility violations: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation) => {
      console.log(`- ${violation.id}: ${violation.description} (${violation.impact})`);
      violation.nodes.forEach((node) => {
        console.log(`  Target: ${node.target.join(', ')}`);
      });
    });
  }
  
  const projectsPanel = page.locator(".panel").filter({ hasText: "Shared Tasks" });
  await expect(projectsPanel).toHaveScreenshot("projects-panel.png");
});

test("calendar shows toolbar with view options and Monday as first day", async ({ page }) => {
  await page.goto("/");

  // Verify calendar toolbar is visible
  const calendarToolbar = page.locator(".calendarToolbar");
  await expect(calendarToolbar.getByRole("button", { name: "Day", exact: true })).toBeVisible();
  await expect(calendarToolbar.getByRole("button", { name: "Work Week" })).toBeVisible();
  await expect(calendarToolbar.getByRole("button", { name: "Week", exact: true })).toBeVisible();
  await expect(calendarToolbar.getByRole("button", { name: "Upcoming" })).toBeVisible();
  await expect(calendarToolbar.getByRole("button", { name: "Month", exact: true })).toBeVisible();
  await expect(calendarToolbar.getByRole("button", { name: "Agenda" })).toBeVisible();

  // Verify week starts with Monday
  const calendarHeaders = page.locator(".calendarHeader");
  await expect(calendarHeaders.first()).toHaveText("Mon");
  await expect(calendarHeaders.nth(6)).toHaveText("Sun");

  // Check accessibility on calendar view (non-blocking for now)
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`Calendar view accessibility violations: ${accessibilityScanResults.violations.length}`);
    accessibilityScanResults.violations.forEach((violation) => {
      console.log(`- ${violation.id}: ${violation.description} (${violation.impact})`);
      violation.nodes.forEach((node) => {
        console.log(`  Target: ${node.target.join(', ')}`);
      });
    });
  }
});

test("calendar view buttons switch content", async ({ page }) => {
  await page.goto("/");

  const calendarToolbar = page.locator(".calendarToolbar");
  const dayView = page.locator(".calendarDayView");
  const weekView = page.locator(".calendarWeekView");

  // Click Day view
  await calendarToolbar.getByRole("button", { name: "Day", exact: true }).click();
  // Day view with no events should show empty state
  await expect(page.getByText("No events scheduled for this day.")).toBeVisible();
  await expect(dayView.getByText("Add reminder")).toBeVisible();
  await expect(dayView.getByText("Add task")).toBeVisible();
  // Should NOT show Back to month button
  await expect(page.getByText("Back to month")).not.toBeVisible();

  // Click Work Week view
  await calendarToolbar.getByRole("button", { name: "Work Week" }).click();
  await expect(weekView.getByRole("heading", { name: "Work Week" })).toBeVisible();
  await expect(page.getByText("No events scheduled for this work week.")).toBeVisible();
  // Should NOT show Back to month button
  await expect(page.getByText("Back to month")).not.toBeVisible();

  // Click Week view
  await calendarToolbar.getByRole("button", { name: "Week", exact: true }).click();
  await expect(weekView.getByRole("heading", { name: "Week" })).toBeVisible();
  await expect(page.getByText("No events scheduled for this week.")).toBeVisible();
  // Should NOT show Back to month button
  await expect(page.getByText("Back to month")).not.toBeVisible();

  // Click Upcoming view
  await calendarToolbar.getByRole("button", { name: "Upcoming" }).click();
  await expect(page.getByText("Upcoming (Next 14 Days)")).toBeVisible();
  // Should NOT show Back to month button
  await expect(page.getByText("Back to month")).not.toBeVisible();

  // Click Agenda view
  await calendarToolbar.getByRole("button", { name: "Agenda" }).click();
  // Should NOT show Back to month button
  await expect(page.getByText("Back to month")).not.toBeVisible();

  // Click Month view to return
  await calendarToolbar.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".calendarHeader").first()).toHaveText("Mon");
  // Month view should be active (lower pill row was removed)
  await expect(calendarToolbar.getByRole("button", { name: "Month", exact: true })).toHaveClass(
    /calendarToolbarButtonActive/
  );
});

test("top module buttons switch between Today, Inbox, Memos, Reminders, and Tasks", async ({ page }) => {
  await page.goto("/");

  // Click Today
  const todayButton = page.locator(".moduleTab").filter({ hasText: "Today" });
  await todayButton.click();
  await expect(todayButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^daily command center$/i })).toBeVisible();

  // Click Inbox
  const inboxButton = page.locator(".moduleTab").filter({ hasText: "Inbox" });
  await inboxButton.click();
  await expect(inboxButton).toHaveClass(/moduleTabActive/);

  // Click Memos
  const memosButton = page.locator(".moduleTab").filter({ hasText: "Memos" });
  await memosButton.click();
  await expect(memosButton).toHaveClass(/moduleTabActive/);

  // Click Reminders
  const remindersButton = page.locator(".moduleTab").filter({ hasText: "Reminders" });
  await remindersButton.click();
  await expect(remindersButton).toHaveClass(/moduleTabActive/);

  // Click Tasks
  const tasksButton = page.locator(".moduleTab").filter({ hasText: "Tasks" });
  await tasksButton.click();
  await expect(tasksButton).toHaveClass(/moduleTabActive/);
});

test("keyboard-only navigation for main workflow", async ({ page }) => {
  await page.goto("/");

  // Focus and activate Today button
  const todayButton = page.locator(".moduleTab").filter({ hasText: "Today" });
  await todayButton.focus();
  await expect(todayButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(todayButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^daily command center$/i })).toBeVisible();

  // Focus and activate Inbox button
  const inboxButton = page.locator(".moduleTab").filter({ hasText: "Inbox" });
  await inboxButton.focus();
  await expect(inboxButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(inboxButton).toHaveClass(/moduleTabActive/);

  // Focus and return to Home button
  const homeButton = page.getByRole("button", { name: /^Home$/ }).first();
  await homeButton.focus();
  await expect(homeButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(homeButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^calendar$/i })).toBeVisible();
});

test("command palette returns focus to trigger on Escape", async ({ page }) => {
  await page.goto("/");

  const commandInput = page.getByRole("textbox", { name: /message the assistant/i });
  await commandInput.focus();
  await expect(commandInput).toBeFocused();

  // Open command palette with Ctrl+K
  await page.keyboard.press("Control+k");
  const paletteInput = page.getByRole("textbox", { name: "Search" });
  await expect(paletteInput).toBeVisible();
  await expect(paletteInput).toBeFocused();

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(paletteInput).not.toBeVisible();
  await expect(commandInput).toBeFocused();
});

test("quick capture returns focus to trigger on Escape", async ({ page }) => {
  await page.goto("/");

  const commandInput = page.getByRole("textbox", { name: /message the assistant/i });
  await commandInput.focus();
  await expect(commandInput).toBeFocused();

  // Open quick capture via command
  await commandInput.fill("capture");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /^Quick Capture$/i })).toBeVisible();
  const quickCaptureInput = page.getByRole("textbox", { name: /what do you want to capture/i });
  await expect(quickCaptureInput).toBeVisible();
  await expect(quickCaptureInput).toBeFocused();

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(quickCaptureInput).not.toBeVisible();
  await expect(commandInput).toBeFocused();
});

test("theme switches without page reload", async ({ page }) => {
  await page.goto("/");

  // Track whether the page reloads during the theme switch.
  let reloadCount = 0;
  page.on("load", () => {
    reloadCount += 1;
  });

  // Open the Appearance panel.
  await page.getByRole("button", { name: /Customize appearance/i }).click();
  await expect(page.getByRole("heading", { name: /^Appearance$/i })).toBeVisible();

  // Switch to the Obsidian preset.
  const obsidianButton = page.getByRole("button", { name: "Obsidian", exact: true });
  await obsidianButton.click();
  await expect(obsidianButton).toHaveClass(/pillButtonActive/);

  // Verify the theme persisted to localStorage without a reload.
  const theme = await page.evaluate(() => {
    const raw = window.localStorage.getItem("assistant-theme");
    return raw ? JSON.parse(raw).preset : null;
  });
  expect(theme).toBe("obsidian");
  expect(reloadCount).toBe(0);

  // Close the panel and confirm the app remains on the same page.
  await page.getByRole("button", { name: /Close appearance panel/i }).click();
  await expect(page.getByRole("heading", { name: /^Appearance$/i })).not.toBeVisible();
  await expect(page).toHaveURL("/");
});
