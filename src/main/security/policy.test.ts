import { describe, expect, it } from "vitest";
import { PERSONAL_DEFAULTS, CORPORATE_DEFAULTS } from "./policy";

describe("Security Policy Constants", () => {
  it("personal defaults allow all integrations", () => {
    expect(PERSONAL_DEFAULTS.mode).toBe("personal");
    expect(PERSONAL_DEFAULTS.allowAi).toBe(true);
    expect(PERSONAL_DEFAULTS.allowTeamSync).toBe(true);
    expect(PERSONAL_DEFAULTS.allowHomeAssistant).toBe(true);
    expect(PERSONAL_DEFAULTS.allowCrashReporting).toBe(true);
  });

  it("corporate defaults disable all integrations", () => {
    expect(CORPORATE_DEFAULTS.mode).toBe("corporate");
    expect(CORPORATE_DEFAULTS.allowAi).toBe(false);
    expect(CORPORATE_DEFAULTS.allowTeamSync).toBe(false);
    expect(CORPORATE_DEFAULTS.allowHomeAssistant).toBe(false);
    expect(CORPORATE_DEFAULTS.allowCrashReporting).toBe(false);
  });
});
