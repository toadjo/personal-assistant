/**
 * Secure secret storage helper that fails closed when OS encryption is unavailable.
 *
 * This is the single source of truth for secret storage across the application.
 * All secret storage (HA tokens, AI keys, team sessions) must use this helper.
 *
 * Behavior:
 * - If safeStorage.isEncryptionAvailable() is true, encrypt and store
 * - If safeStorage.isEncryptionAvailable() is false, throw a structured error
 * - Existing plaintext secrets are treated as insecure and require reconnection
 * - Clear operations remove both encrypted and legacy plaintext storage
 */

import { safeStorage } from "electron";
import { mainLog } from "../log";
import { encodeAssistantInvokeFailure } from "../../shared/invokeErrors";

const ENCRYPTED_PREFIX = "sse1:";

/**
 * Error thrown when secure storage is unavailable.
 */
export class SecureStorageUnavailableError extends Error {
  constructor() {
    super("Secure storage (OS encryption) is required to save API keys and tokens. Please ensure your system supports secure storage.");
    this.name = "SecureStorageUnavailableError";
  }
}

/**
 * Error thrown when a legacy plaintext secret is detected.
 */
export class LegacyPlaintextSecretError extends Error {
  constructor(secretType: string) {
    super(
      `Legacy plaintext ${secretType} detected. For security, please reconnect this integration. Your previous credential will not be used.`
    );
    this.name = "LegacyPlaintextSecretError";
  }
}

/**
 * Encrypts a secret string using safeStorage.
 * Throws SecureStorageUnavailableError if encryption is not available.
 */
export function encryptSecret(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SecureStorageUnavailableError();
  }
  const buf = safeStorage.encryptString(value);
  return `${ENCRYPTED_PREFIX}${buf.toString("base64")}`;
}

/**
 * Decrypts a secret string that was encrypted with encryptSecret.
 * Returns null if decryption fails or if the value is not encrypted.
 */
export function decryptSecret(value: string): string | null {
  if (typeof value !== "string" || !value) return null;
  
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted - this is legacy plaintext
    return null;
  }
  
  try {
    const buf = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), "base64");
    return safeStorage.decryptString(buf);
  } catch (error) {
    mainLog.error("Failed to decrypt secret.", error);
    return null;
  }
}

/**
 * Checks if a value is encrypted (starts with the encrypted prefix).
 */
export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Converts a SecureStorageUnavailableError to an invoke failure for renderer.
 */
export function secureStorageUnavailableToInvokeError(): Error {
  const failure = encodeAssistantInvokeFailure({
    domain: "ipc_validation",
    code: "SECURE_STORAGE_UNAVAILABLE",
    message: "Secure storage (OS encryption) is required to save API keys and tokens. Please ensure your system supports secure storage.",
    retryable: false
  });
  return new Error(`Error invoking remote method: ${failure.message}`);
}
