/**
 * Secret redaction utility for logs and persisted errors.
 *
 * Redacts likely secrets from strings before persistence to prevent
 * API keys, tokens, and credentials from leaking into logs or database.
 */

/**
 * Patterns for common secret formats that should be redacted.
 */
const SECRET_PATTERNS = [
  // OpenAI API keys: sk-...
  /sk-[a-zA-Z0-9]{32,}/g,
  // Anthropic API keys: sk-ant-...
  /sk-ant-[a-zA-Z0-9_-]{32,}/g,
  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9_-]{20,}/gi,
  // Home Assistant long-lived access tokens
  /[a-zA-Z0-9_-]{40,}/g,
  // Supabase anon/role keys
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // Generic API key patterns (key=..., api_key=..., token=...)
  /(?:key|api_key|token|secret|password)[\s=:]+[a-zA-Z0-9_-]{20,}/gi,
  // Authorization headers
  /Authorization:\s*[a-zA-Z0-9_-]{20,}/gi
] as const;

/**
 * Redaction placeholder for detected secrets.
 */
const REDACTION_PLACEHOLDER = "[REDACTED]";

/**
 * Redacts secrets from a string using common patterns.
 * Returns the redacted string with secrets replaced by placeholders.
 */
export function redactSecrets(value: string): string {
  let redacted = value;

  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTION_PLACEHOLDER);
  }

  return redacted;
}

/**
 * Redacts secrets from an object's string properties.
 * Returns a new object with redacted values.
 */
export function redactSecretsFromObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    const value = result[key];
    if (typeof value === "string") {
      result[key] = redactSecrets(value) as T[Extract<keyof T, string>];
    }
  }

  return result;
}
