import { decodeAssistantInvokeFailure } from "../../shared/invokeErrors";

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Single formatter for desk-visible `window.assistantApi` invoke failures.
 * Decodes structured main-process errors (all domains); appends a short retry hint when `retryable` is true.
 * Falls back to {@link getErrorMessage} for plain errors (including legacy non-encoded messages).
 */
export function getAssistantInvokeErrorMessage(err: unknown): string {
  const failure = decodeAssistantInvokeFailure(err);
  if (failure) {
    const hint = failure.retryable ? " You can try again in a moment." : "";
    return `${failure.message}${hint}`;
  }
  return getErrorMessage(err);
}
