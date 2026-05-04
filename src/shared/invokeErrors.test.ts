import { describe, expect, it } from "vitest";
import {
  automationFailureCodes,
  type AssistantInvokeFailure,
  ASSISTANT_INVOKE_ERROR_PREFIX,
  decodeAssistantInvokeFailure,
  decodeHomeAssistantInvokeFailure,
  encodeAssistantInvokeFailure,
  encodeHomeAssistantInvokeFailure
} from "./invokeErrors";

describe("invokeErrors", () => {
  const domains = ["home_assistant", "ipc_validation", "automation", "notes", "reminders"] as const;

  it.each(domains)("round-trips structured failures for domain %s", (domain) => {
    const original: AssistantInvokeFailure = {
      domain,
      code: "TEST_CODE",
      message: "Something happened.",
      retryable: domain === "home_assistant"
    };
    const err = encodeAssistantInvokeFailure(original);
    expect(err.message.startsWith(ASSISTANT_INVOKE_ERROR_PREFIX)).toBe(true);
    expect(decodeAssistantInvokeFailure(err)).toEqual(original);
  });

  it("encodeHomeAssistantInvokeFailure remains compatible with decodeAssistantInvokeFailure", () => {
    const err = encodeHomeAssistantInvokeFailure({
      domain: "home_assistant",
      code: "HTTP_401",
      message: "Unauthorized.",
      retryable: false
    });
    expect(decodeAssistantInvokeFailure(err)?.domain).toBe("home_assistant");
    expect(decodeHomeAssistantInvokeFailure(err)?.code).toBe("HTTP_401");
  });

  it("returns null for plain errors and malformed payloads", () => {
    expect(decodeAssistantInvokeFailure(new Error("plain"))).toBeNull();
    expect(decodeAssistantInvokeFailure("x")).toBeNull();
    expect(decodeAssistantInvokeFailure(new Error(`${ASSISTANT_INVOKE_ERROR_PREFIX}{`))).toBeNull();
    expect(
      decodeAssistantInvokeFailure(
        new Error(
          `${ASSISTANT_INVOKE_ERROR_PREFIX}${JSON.stringify({ domain: "unknown", code: "x", message: "m", retryable: false })}`
        )
      )
    ).toBeNull();
  });

  describe("automation failure codes", () => {
    it.each(automationFailureCodes)("includes code %s", (code) => {
      expect(code).toBeDefined();
    });

    it("round-trips all automation failure codes", () => {
      const testCases: Array<{ code: (typeof automationFailureCodes)[number]; retryable: boolean }> = [
        { code: "RULE_NOT_FOUND", retryable: false },
        { code: "INVALID_STORED_CONFIG", retryable: false },
        { code: "ACTION_TIMEOUT", retryable: true },
        { code: "ACTION_FAILED", retryable: false }
      ];

      for (const testCase of testCases) {
        const failure: AssistantInvokeFailure = {
          domain: "automation",
          code: testCase.code,
          message: `Test message for ${testCase.code}`,
          retryable: testCase.retryable
        };
        const err = encodeAssistantInvokeFailure(failure);
        const decoded = decodeAssistantInvokeFailure(err);
        expect(decoded).toEqual(failure);
      }
    });
  });
});
