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
  await expect(page.getByRole("button", { name: "Day" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Work Week" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Week" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upcoming" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Month" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agenda" })).toBeVisible();
  
  // Verify week starts with Monday
  const calendarHeaders = page.locator(".calendarHeader");
  await expect(calendarHeaders.first()).toHaveText("Mon");
  await expect(calendarHeaders.nth(6)).toHaveText("Sun");
});
