import { describe, expect, it } from "vitest";
import {
  encodeAssistantInvokeFailure,
  encodeHomeAssistantInvokeFailure,
  IPC_VALIDATION_DEFAULT_MESSAGE
} from "../../shared/invokeErrors";
import { getAssistantInvokeErrorMessage, getErrorMessage } from "./errors";

describe("getAssistantInvokeErrorMessage", () => {
  it("appends retry hint for structured retryable failures (any domain)", () => {
    const err = encodeAssistantInvokeFailure({
      domain: "automation",
      code: "ACTION_FAILED",
      message: "Automation action did not finish.",
      retryable: true
    });
    expect(getAssistantInvokeErrorMessage(err)).toBe(
      "Automation action did not finish. You can try again in a moment."
    );
  });

  it("uses stable copy for ipc_validation without retry hint", () => {
    const err = encodeAssistantInvokeFailure({
      domain: "ipc_validation",
      code: "INVALID_PAYLOAD",
      message: IPC_VALIDATION_DEFAULT_MESSAGE,
      retryable: false
    });
    expect(getAssistantInvokeErrorMessage(err)).toBe(IPC_VALIDATION_DEFAULT_MESSAGE);
  });

  it("formats structured failures wrapped by Electron invoke errors", () => {
    const encoded = encodeAssistantInvokeFailure({
      domain: "ai",
      code: "RATE_LIMITED",
      message: "OpenAI rate limit exceeded.",
      retryable: true
    });
    const wrapped = new Error(`Error invoking remote method 'ai:chat': Error: ${encoded.message}`);

    expect(getAssistantInvokeErrorMessage(wrapped)).toBe(
      "OpenAI rate limit exceeded. You can try again in a moment."
    );
  });

  it("formats legacy Home Assistant payloads", () => {
    const err = encodeHomeAssistantInvokeFailure({
      domain: "home_assistant",
      code: "HTTP_401",
      message: "Unauthorized.",
      retryable: false
    });
    expect(getAssistantInvokeErrorMessage(err)).toBe("Unauthorized.");
  });

  it("falls back to getErrorMessage for non-encoded errors", () => {
    expect(getAssistantInvokeErrorMessage(new Error("plain"))).toBe(getErrorMessage(new Error("plain")));
  });
});
