/**
 * Tests for team error mapping.
 */

import { describe, expect, it } from "vitest";
import { mapTeamError } from "./errors";
import { decodeAssistantInvokeFailure } from "../../shared/invokeErrors";

describe("mapTeamError", () => {
  it("maps not configured error to NOT_CONFIGURED", () => {
    expect(() => mapTeamError(new Error("Team mode is not configured"))).toThrow();
    try {
      mapTeamError(new Error("Team mode is not configured"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "NOT_CONFIGURED",
        message: "Team mode is not configured. Please set your Supabase URL and anon key in settings.",
        retryable: false
      });
    }
  });

  it("maps not authenticated error to NOT_AUTHENTICATED", () => {
    try {
      mapTeamError(new Error("Not authenticated"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "NOT_AUTHENTICATED",
        message: "Authentication failed. Please try again.",
        retryable: true
      });
    }
  });

  it("maps invalid workspace key error to INVALID_KEY", () => {
    try {
      mapTeamError(new Error("Invalid workspace key"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "INVALID_KEY",
        message: "Invalid workspace key. Please check the key and try again.",
        retryable: false
      });
    }
  });

  it("maps network error to NETWORK_FAILURE", () => {
    try {
      mapTeamError(new Error("Network error"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "NETWORK_FAILURE",
        message: "Network error. Please check your connection and try again.",
        retryable: true
      });
    }
  });

  it("maps fetch error to NETWORK_FAILURE", () => {
    try {
      mapTeamError(new Error("Fetch failed"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "NETWORK_FAILURE",
        message: "Network error. Please check your connection and try again.",
        retryable: true
      });
    }
  });

  it("maps generic error to RLS_DENIED", () => {
    try {
      mapTeamError(new Error("Some other error"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded).toEqual({
        domain: "team",
        code: "RLS_DENIED",
        message: "Some other error",
        retryable: false
      });
    }
  });

  it("handles case-insensitive error matching", () => {
    try {
      mapTeamError(new Error("TEAM MODE IS NOT CONFIGURED"));
    } catch (error) {
      const decoded = decodeAssistantInvokeFailure(error);
      expect(decoded?.code).toBe("NOT_CONFIGURED");
    }
  });
});
