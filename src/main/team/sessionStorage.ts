/**
 * Supabase auth session storage adapter for Electron main process.
 *
 * Persists the anonymous session JSON to disk using Electron's safeStorage.
 * Fails closed if encryption is unavailable.
 * Uses synchronous `fs` calls to avoid race conditions during rapid token refreshes.
 */

import { app } from "electron";
import { mainLog } from "../log";
import * as fs from "node:fs";
import * as path from "node:path";
import { decryptSecret, encryptSecret, SecureStorageUnavailableError } from "../services/secureSecrets";

const SESSION_FILE_NAME = "team-session.enc";
const PLAINTEXT_FALLBACK_NAME = "team-session.json";

/**
 * Returns the path to the session file.
 */
function getSessionPath(): string {
  return path.join(app.getPath("userData"), SESSION_FILE_NAME);
}

/**
 * Returns the path to the legacy plaintext fallback file.
 */
function getPlaintextPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, PLAINTEXT_FALLBACK_NAME);
}

/**
 * Reads the session file and returns the parsed JSON string, or null if missing/invalid.
 */
function readSessionFile(): string | null {
  const encryptedPath = getSessionPath();
  const plaintextPath = getPlaintextPath();

  // Try encrypted first
  if (fs.existsSync(encryptedPath)) {
    try {
      const encrypted = fs.readFileSync(encryptedPath);
      const encryptedString = encrypted.toString("base64");
      // The file stores the raw encrypted buffer as base64, not with the prefix
      // We need to add the prefix for decryptSecret to recognize it
      const prefixed = `sse1:${encryptedString}`;
      const decrypted = decryptSecret(prefixed);
      if (decrypted) {
        return decrypted;
      }
    } catch (error) {
      mainLog.error("Failed to decrypt team session.", error);
    }
  }

  // Check for legacy plaintext and warn
  if (fs.existsSync(plaintextPath)) {
    mainLog.warn("Legacy plaintext team session detected. For security, please reconnect Team integration.");
    // Don't use the plaintext session - require reconnection
  }

  return null;
}

/**
 * Writes the session JSON string to disk (encrypted only).
 * Throws SecureStorageUnavailableError if encryption is unavailable.
 */
function writeSessionFile(value: string): void {
  const encryptedPath = getSessionPath();

  try {
    // encryptSecret returns a string with the prefix, but we need to strip it
    // and store the raw encrypted buffer as base64 for file storage
    const encryptedWithPrefix = encryptSecret(value);
    const encryptedBuffer = Buffer.from(encryptedWithPrefix.slice(5), "base64"); // Remove "sse1:" prefix
    fs.writeFileSync(encryptedPath, encryptedBuffer);
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      throw error;
    }
    mainLog.error("Failed to encrypt team session.", error);
    throw new Error("Failed to save team session.");
  }
}

/**
 * Removes the session file(s).
 */
function removeSessionFile(): void {
  const encryptedPath = getSessionPath();
  const plaintextPath = getPlaintextPath();

  try {
    fs.unlinkSync(encryptedPath);
  } catch {
    // Ignore missing file
  }

  try {
    fs.unlinkSync(plaintextPath);
  } catch {
    // Ignore missing file
  }
}

/**
 * Supabase storage adapter implementation.
 *
 * This is a synchronous adapter because Supabase's auth storage interface
 * expects synchronous I/O. We use `fs.readFileSync/writeFileSync` to avoid
 * race conditions during rapid token refreshes.
 */
export const teamSessionStorage = {
  getItem(key: string): string | null {
    if (key !== "supabase-auth-token") {
      return null;
    }
    return readSessionFile();
  },

  setItem(key: string, value: string): void {
    if (key !== "supabase-auth-token") {
      return;
    }
    writeSessionFile(value);
  },

  removeItem(key: string): void {
    if (key !== "supabase-auth-token") {
      return;
    }
    removeSessionFile();
  }
};
