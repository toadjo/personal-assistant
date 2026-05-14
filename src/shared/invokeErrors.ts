import { z } from "zod";

/**
 * Prefix for errors thrown from main-process IPC handlers that the renderer can decode
 * into structured fields (retry hints, codes for telemetry). Plain `Error` messages stay human-readable.
 */
export const ASSISTANT_INVOKE_ERROR_PREFIX = "assistant:invoke:v1:";

/** Default copy when invoke payload validation fails (never expose raw Zod issues to the UI). */
export const IPC_VALIDATION_DEFAULT_MESSAGE = "That request had invalid data. Please try again.";

export const assistantInvokeDomains = ["home_assistant", "ipc_validation", "automation", "notes", "reminders", "team"] as const;

/**
 * Automation failure codes and their retryability semantics.
 *
 * RULE_NOT_FOUND: Missing or empty rule ID in renderer-triggered operations. Not retryable.
 * INVALID_STORED_CONFIG: Malformed persisted rows or action config that cannot be mapped. Not retryable.
 * ACTION_TIMEOUT: Automation action exceeded the timeout budget. Retryable.
 * ACTION_FAILED: Non-timeout execution failures after retries are exhausted. Retryable only when the root cause is transient.
 */
export const automationFailureCodes = [
  "RULE_NOT_FOUND",
  "INVALID_STORED_CONFIG",
  "ACTION_TIMEOUT",
  "ACTION_FAILED"
] as const;

/**
 * Team mode failure codes and their retryability semantics.
 *
 * NOT_CONFIGURED: Team mode is not configured (missing URL or anon key). Not retryable.
 * NOT_AUTHENTICATED: Anonymous sign-in failed or session expired. Retryable.
 * INVALID_KEY: Workspace key does not exist or is malformed. Not retryable.
 * RLS_DENIED: Row-level security blocked the operation. Not retryable.
 * NETWORK_FAILURE: Network error connecting to Supabase. Retryable.
 */
export const teamFailureCodes = [
  "NOT_CONFIGURED",
  "NOT_AUTHENTICATED",
  "INVALID_KEY",
  "RLS_DENIED",
  "NETWORK_FAILURE"
] as const;

export type AssistantInvokeDomain = (typeof assistantInvokeDomains)[number];

const assistantInvokeFailureSchema = z.object({
  domain: z.enum(assistantInvokeDomains),
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(8_000),
  retryable: z.boolean()
});

export type AssistantInvokeFailure = z.infer<typeof assistantInvokeFailureSchema>;

export type HomeAssistantInvokeFailure = Omit<AssistantInvokeFailure, "domain"> & { domain: "home_assistant" };

export function encodeAssistantInvokeFailure(failure: AssistantInvokeFailure): Error {
  const json = JSON.stringify(failure);
  return new Error(`${ASSISTANT_INVOKE_ERROR_PREFIX}${json}`);
}

/** @deprecated Use {@link encodeAssistantInvokeFailure} with `domain: "home_assistant"`. */
export function encodeHomeAssistantInvokeFailure(failure: HomeAssistantInvokeFailure): Error {
  return encodeAssistantInvokeFailure(failure);
}

export function decodeAssistantInvokeFailure(err: unknown): AssistantInvokeFailure | null {
  if (!(err instanceof Error)) return null;
  const { message } = err;
  if (!message.startsWith(ASSISTANT_INVOKE_ERROR_PREFIX)) return null;
  const raw = message.slice(ASSISTANT_INVOKE_ERROR_PREFIX.length);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = assistantInvokeFailureSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Legacy decode: Home Assistant-only payloads from earlier builds (same shape, domain literal). */
export function decodeHomeAssistantInvokeFailure(err: unknown): HomeAssistantInvokeFailure | null {
  const decoded = decodeAssistantInvokeFailure(err);
  if (!decoded || decoded.domain !== "home_assistant") return null;
  return decoded as HomeAssistantInvokeFailure;
}
