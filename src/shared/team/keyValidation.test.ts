import { describe, expect, it } from "vitest";
import {
  TEAM_WORKSPACE_KEY_ALPHABET,
  TEAM_WORKSPACE_KEY_LENGTH,
  generateWorkspaceKey,
  validateWorkspaceKey
} from "./keyValidation";

describe("validateWorkspaceKey", () => {
  it("accepts a well-formed key", () => {
    expect(validateWorkspaceKey("ABCDEFGHJKMNPQRS")).toEqual({ ok: true });
    expect(validateWorkspaceKey("23456789ABCDEFGH")).toEqual({ ok: true });
  });

  it("rejects non-string input", () => {
    expect(validateWorkspaceKey(undefined)).toEqual({
      ok: false,
      reason: "Workspace key must be a string."
    });
    expect(validateWorkspaceKey(null)).toEqual({
      ok: false,
      reason: "Workspace key must be a string."
    });
    expect(validateWorkspaceKey(12345678 as unknown)).toEqual({
      ok: false,
      reason: "Workspace key must be a string."
    });
  });

  it("rejects an empty string with the dedicated 'required' message", () => {
    expect(validateWorkspaceKey("")).toEqual({
      ok: false,
      reason: "Workspace key is required."
    });
  });

  it("rejects a key that is too short", () => {
    expect(validateWorkspaceKey("ABCDEFGH")).toEqual({
      ok: false,
      reason: `Workspace key must be exactly ${TEAM_WORKSPACE_KEY_LENGTH} characters.`
    });
  });

  it("rejects a key that is too long", () => {
    expect(validateWorkspaceKey("ABCDEFGHJKMNPQRSTUVW")).toEqual({
      ok: false,
      reason: `Workspace key must be exactly ${TEAM_WORKSPACE_KEY_LENGTH} characters.`
    });
  });

  it("rejects lowercase characters", () => {
    const result = validateWorkspaceKey("abcdefghjkmnpqrs");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/uppercase/i);
    }
  });

  it("rejects ambiguous characters (O, 0, I, 1, L)", () => {
    const ambiguousSamples = [
      "OBCDEFGHJKMNPQRS",
      "0BCDEFGHJKMNPQRS",
      "IBCDEFGHJKMNPQRS",
      "1BCDEFGHJKMNPQRS",
      "LBCDEFGHJKMNPQRS"
    ];
    for (const sample of ambiguousSamples) {
      const result = validateWorkspaceKey(sample);
      expect(result.ok, `expected ${sample} to be rejected`).toBe(false);
    }
  });

  it("rejects non-alphanumeric characters", () => {
    expect(validateWorkspaceKey("ABCDEFGH-KMNPQRS").ok).toBe(false);
    expect(validateWorkspaceKey("ABCDEFGH KMNPQRS!").ok).toBe(false);
  });
});

describe("generateWorkspaceKey", () => {
  it("generates a 16-character key", () => {
    const key = generateWorkspaceKey();
    expect(key).toHaveLength(TEAM_WORKSPACE_KEY_LENGTH);
  });

  it("generates a key that passes validation", () => {
    const key = generateWorkspaceKey();
    const result = validateWorkspaceKey(key);
    expect(result.ok).toBe(true);
  });

  it("generates keys that only use the valid alphabet", () => {
    const key = generateWorkspaceKey();
    for (const char of key) {
      expect(TEAM_WORKSPACE_KEY_ALPHABET).toContain(char);
    }
  });

  it("generates different keys on each call", () => {
    const key1 = generateWorkspaceKey();
    const key2 = generateWorkspaceKey();
    expect(key1).not.toBe(key2);
  });
});
