/**
 * Workspace invite key format and validation.
 *
 * A workspace key is a short, human-shareable invite code. It is NOT a password and
 * NOT a long-term identity. Keys are validated locally before being sent to the
 * backend so we can surface fast, friendly errors without a network round-trip.
 *
 * Format rules (V1):
 * - 16 characters
 * - Uppercase letters A-Z and digits 2-9
 * - Ambiguous characters excluded to reduce transcription errors: O, 0, I, 1, L
 */

const WORKSPACE_KEY_LENGTH = 16;
const WORKSPACE_KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const WORKSPACE_KEY_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$/;

export type WorkspaceKeyValidation = { ok: true } | { ok: false; reason: string };

/**
 * Validates a workspace invite key. Pure function with no IPC dependencies so
 * the renderer can preflight before invoking team:workspaces:join.
 */
export function validateWorkspaceKey(key: unknown): WorkspaceKeyValidation {
  if (typeof key !== "string") {
    return { ok: false, reason: "Workspace key must be a string." };
  }
  if (key.length === 0) {
    return { ok: false, reason: "Workspace key is required." };
  }
  if (key.length !== WORKSPACE_KEY_LENGTH) {
    return { ok: false, reason: `Workspace key must be exactly ${WORKSPACE_KEY_LENGTH} characters.` };
  }
  if (!WORKSPACE_KEY_PATTERN.test(key)) {
    return {
      ok: false,
      reason: "Workspace key may only contain uppercase letters and digits 2-9 (no O, 0, I, 1, or L)."
    };
  }
  return { ok: true };
}

/**
 * Generates a random 16-character workspace key using the valid alphabet.
 * Cryptographically secure for invite codes (not passwords).
 */
export function generateWorkspaceKey(): string {
  const array = new Uint8Array(WORKSPACE_KEY_LENGTH);
  crypto.getRandomValues(array);
  let key = "";
  for (let i = 0; i < WORKSPACE_KEY_LENGTH; i++) {
    const value = array[i];
    if (value !== undefined) {
      key += WORKSPACE_KEY_ALPHABET[value % WORKSPACE_KEY_ALPHABET.length];
    }
  }
  return key;
}

export const TEAM_WORKSPACE_KEY_LENGTH = WORKSPACE_KEY_LENGTH;
export const TEAM_WORKSPACE_KEY_ALPHABET = WORKSPACE_KEY_ALPHABET;
