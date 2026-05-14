/**
 * Supabase auth session storage adapter for Electron main process.
 *
 * Persists the anonymous session JSON to disk using Electron's safeStorage
 * when available, falling back to plaintext with a single startup warning.
 * Uses synchronous `fs` calls to avoid race conditions during rapid token refreshes.
 */

import { app, safeStorage } from "electron";
import { mainLog } from "../log";
import * as fs from "node:fs";
import * as path from "node:path";

const SESSION_FILE_NAME = "team-session.enc";
const PLAINTEXT_FALLBACK_NAME = "team-session.json";
let encryptionWarningLogged = false;

/**
 * Returns the path to the session file (encrypted or plaintext fallback).
 */
function getSessionPath(): string {
  return path.join(app.getPath("userData"), SESSION_FILE_NAME);
}

/**
 * Returns the path to the plaintext fallback file.
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
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  // Try encrypted first
  if (fs.existsSync(encryptedPath)) {
    try {
      const encrypted = fs.readFileSync(encryptedPath);
      if (encryptionAvailable) {
        const decrypted = safeStorage.decryptString(encrypted);
        return decrypted;
      }
      // If encryption is not available but file exists, it's plaintext
      return encrypted.toString("utf-8");
    } catch {
      return null;
    }
  }

  // Fall back to plaintext
  if (fs.existsSync(plaintextPath)) {
    try {
      const plaintext = fs.readFileSync(plaintextPath, "utf-8");
      return plaintext;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Writes the session JSON string to disk (encrypted or plaintext fallback).
 */
function writeSessionFile(value: string): void {
  const encryptedPath = getSessionPath();
  const plaintextPath = getPlaintextPath();
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  // Log warning once if encryption is not available
  if (!encryptionAvailable && !encryptionWarningLogged) {
    mainLog.warn("[team:session] System does not support safeStorage encryption. Team session will be stored in plaintext.");
    encryptionWarningLogged = true;
  }

  if (encryptionAvailable) {
    try {
      const encrypted = safeStorage.encryptString(value);
      fs.writeFileSync(encryptedPath, encrypted);
      return;
    } catch {
      // Fall through to plaintext on encryption failure
    }
  }

  // Fallback to plaintext
  try {
    fs.writeFileSync(plaintextPath, value, "utf-8");
  } catch {
    // If both fail, silently swallow — session loss is recoverable via re-sign-in
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
