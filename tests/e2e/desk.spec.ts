import path from "node:path";
import { test, expect } from "@playwright/test";

const stubPath = path.join(process.cwd(), "tests", "e2e", "install-assistant-api-stub.js");

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: stubPath });
});

test("desk shell shows assistant command field and module tabs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: /message the assistant/i })).toBeVisible();
  
  // Verify module tabs are visible
  await expect(page.getByRole("button", { name: /^Today$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Inbox$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Calendar$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Memos$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reminders$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Tasks$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Automations$/ })).toBeVisible();
  
  // Verify Today module is active by default
  await expect(page.getByRole("button", { name: /^Today$/ })).toHaveClass(/moduleTabActive/);
  
  // Click Memos tab and verify memos panel is shown
  await page.getByRole("button", { name: /^Memos$/ }).click();
  await expect(page.getByRole("heading", { name: /^memos$/i })).toBeVisible();
  
  // Click Reminders tab and verify reminders panel is shown
  await page.getByRole("button", { name: /^Reminders$/ }).click();
  await expect(page.getByRole("heading", { name: /^reminders$/i })).toBeVisible();
  
  // Click Tasks tab and verify tasks panel is shown
  await page.getByRole("button", { name: /^Tasks$/ }).click();
  await expect(page.getByRole("heading", { name: /^tasks$/i })).toBeVisible();
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
