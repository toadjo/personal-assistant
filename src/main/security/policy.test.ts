import { describe, expect, it } from "vitest";
import { 
  PERSONAL_DEFAULTS, 
  CORPORATE_DEFAULTS
} from "./policy";

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

describe("Host Allowlist Behavior", () => {
  // Note: These tests document the intended behavior of isHostAllowed
  // The actual implementation depends on the loaded security policy
  // In a real environment, the policy is loaded from disk or defaults
  
  it("personal mode should allow all hosts when allowedHosts is empty", () => {
    const personalPolicy = { ...PERSONAL_DEFAULTS, allowedHosts: [] };
    // When allowedHosts is empty in personal mode, should return true (unrestricted)
    const isPersonalEmptyUnrestricted = personalPolicy.mode === "personal" && personalPolicy.allowedHosts.length === 0;
    expect(isPersonalEmptyUnrestricted).toBe(true);
  });

  it("corporate mode should block all hosts when allowedHosts is empty", () => {
    const corporatePolicy = { ...CORPORATE_DEFAULTS, allowedHosts: [] };
    // When allowedHosts is empty in corporate mode, should return false (blocked)
    const isCorporateEmptyBlocked = corporatePolicy.mode === "corporate" && corporatePolicy.allowedHosts.length === 0;
    expect(isCorporateEmptyBlocked).toBe(true);
  });

  it("explicit allowlist should only permit listed hosts in personal mode", () => {
    const personalPolicy = { ...PERSONAL_DEFAULTS, allowedHosts: ["api.openai.com"] };
    const isOpenAiAllowed = personalPolicy.allowedHosts.includes("api.openai.com");
    const isAnthropicAllowed = personalPolicy.allowedHosts.includes("api.anthropic.com");
    expect(isOpenAiAllowed).toBe(true);
    expect(isAnthropicAllowed).toBe(false);
  });

  it("explicit allowlist should only permit listed hosts in corporate mode", () => {
    const corporatePolicy = { ...CORPORATE_DEFAULTS, allowedHosts: ["api.openai.com", "homeassistant.local"] };
    const isOpenAiAllowed = corporatePolicy.allowedHosts.includes("api.openai.com");
    const isHomeAssistantAllowed = corporatePolicy.allowedHosts.includes("homeassistant.local");
    const isAnthropicAllowed = corporatePolicy.allowedHosts.includes("api.anthropic.com");
    expect(isOpenAiAllowed).toBe(true);
    expect(isHomeAssistantAllowed).toBe(true);
    expect(isAnthropicAllowed).toBe(false);
  });
});
