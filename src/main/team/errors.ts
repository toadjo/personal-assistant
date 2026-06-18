/**
 * Team error mapping for structured invoke errors.
 *
 * Maps team service errors to structured invoke errors with proper codes,
 * messages, and retryability flags.
 */

import { encodeAssistantInvokeFailure } from "../../shared/invokeErrors";
import { SecureStorageUnavailableError } from "../services/secureSecrets";
import { OutboundIntegrationBlockedError, HostNotAllowedError } from "../security/outboundGuard";

/**
 * Maps team service errors to structured invoke errors.
 *
 * This function analyzes error messages and maps them to appropriate
 * team error codes with user-friendly messages and retryability flags.
 *
 * @throws Always throws - this function is used in catch blocks to re-throw structured errors
 */
export function mapTeamError(error: unknown): never {
  if (!(error instanceof Error)) {
    throw error;
  }

  // Handle secure storage unavailability specifically
  if (error instanceof SecureStorageUnavailableError) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "SECURE_STORAGE_UNAVAILABLE",
      message:
        "Secure storage (OS encryption) is required for team mode. Please ensure your system supports secure storage.",
      retryable: false
    });
  }

  // Handle outbound integration blocked by policy
  if (error instanceof OutboundIntegrationBlockedError) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "INTEGRATION_BLOCKED",
      message: error.message,
      retryable: false
    });
  }

  // Handle host not allowed by policy allowlist
  if (error instanceof HostNotAllowedError) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "HOST_BLOCKED",
      message: error.message,
      retryable: false
    });
  }

  const message = error.message.toLowerCase();

  if (message.includes("not configured") || message.includes("team mode is not configured")) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "NOT_CONFIGURED",
      message: "Team mode is not configured. Please set your Supabase URL and anon key in settings.",
      retryable: false
    });
  }

  if (message.includes("not authenticated")) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "NOT_AUTHENTICATED",
      message: "Authentication failed. Please try again.",
      retryable: true
    });
  }

  if (message.includes("invalid workspace key") || message.includes("invalid key")) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "INVALID_KEY",
      message: "Invalid workspace key. Please check the key and try again.",
      retryable: false
    });
  }

  if (message.includes("network") || message.includes("fetch")) {
    throw encodeAssistantInvokeFailure({
      domain: "team",
      code: "NETWORK_FAILURE",
      message: "Network error. Please check your connection and try again.",
      retryable: true
    });
  }

  // Default to a generic team error for RLS or other issues
  throw encodeAssistantInvokeFailure({
    domain: "team",
    code: "RLS_DENIED",
    message: error.message || "An error occurred in team mode.",
    retryable: false
  });
}
