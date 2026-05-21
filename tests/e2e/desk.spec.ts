import path from "node:path";
import { test, expect } from "@playwright/test";

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

  // Click Today button and verify it becomes active
  const todayButton = page.locator(".moduleTab").filter({ hasText: "Today" });
  await todayButton.click();
  await expect(todayButton).toHaveClass(/moduleTabActive/);
  await expect(page.getByRole("heading", { name: /^daily command center$/i })).toBeVisible();

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
