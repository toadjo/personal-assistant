import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const generatedDir = join(process.cwd(), "assets", "generated");
const generatedPath = join(generatedDir, "calendar-oauth-clients.json");

describe("oauthClientConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.MICROSOFT_CALENDAR_CLIENT_ID;
    rmSync(generatedPath, { force: true });
  });

  afterEach(() => {
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.MICROSOFT_CALENDAR_CLIENT_ID;
    rmSync(generatedPath, { force: true });
  });

  async function loadConfig() {
    return import("./oauthClientConfig");
  }

  it("prefers environment variables over bundled config", async () => {
    mkdirSync(generatedDir, { recursive: true });
    writeFileSync(
      generatedPath,
      JSON.stringify({ googleClientId: "bundled-google", microsoftClientId: "bundled-microsoft" }) + "\n"
    );
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "env-google";
    process.env.MICROSOFT_CALENDAR_CLIENT_ID = "env-microsoft";

    const config = await loadConfig();
    expect(config.getGoogleCalendarClientId()).toBe("env-google");
    expect(config.getMicrosoftCalendarClientId()).toBe("env-microsoft");
  });

  it("reads bundled client IDs when env is unset", async () => {
    mkdirSync(generatedDir, { recursive: true });
    writeFileSync(
      generatedPath,
      JSON.stringify({ googleClientId: "bundled-google", microsoftClientId: "bundled-microsoft" }) + "\n"
    );

    const config = await loadConfig();
    expect(config.getGoogleCalendarClientId()).toBe("bundled-google");
    expect(config.getMicrosoftCalendarClientId()).toBe("bundled-microsoft");
    expect(config.getConnectedCalendarOAuthSetupStatus()).toEqual({
      googleConfigured: true,
      microsoftConfigured: true
    });
  });

  it("returns empty strings when neither env nor bundle is present", async () => {
    const config = await loadConfig();
    expect(config.getGoogleCalendarClientId()).toBe("");
    expect(config.getMicrosoftCalendarClientId()).toBe("");
    expect(config.getConnectedCalendarOAuthSetupStatus()).toEqual({
      googleConfigured: false,
      microsoftConfigured: false
    });
    expect(() => config.assertGoogleCalendarClientIdConfigured()).toThrow(/connected_calendar_oauth_not_configured/);
  });

  it("ignores missing generated file", async () => {
    expect(existsSync(generatedPath)).toBe(false);
    const config = await loadConfig();
    expect(config.getGoogleCalendarClientId()).toBe("");
  });
});
