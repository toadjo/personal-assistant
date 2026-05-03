import path from "node:path";
import { test, expect } from "@playwright/test";

const stubPath = path.join(process.cwd(), "tests", "e2e", "install-assistant-api-stub.js");

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: stubPath });
});

test("desk shell shows assistant command field and memo panel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: /message the assistant/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^memos$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^follow-ups$/i })).toBeVisible();
});

test("household route loads household shell", async ({ page }) => {
  await page.goto("/#household");
  await expect(page.getByRole("heading", { level: 1, name: /^Household$/ })).toBeVisible();
});
