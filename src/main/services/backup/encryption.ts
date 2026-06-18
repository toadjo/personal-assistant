import { encryptSecret, decryptSecret, SecureStorageUnavailableError } from "../secureSecrets";
import { isCorporateMode } from "../../security/policy";
import type { BackupPayload } from "./types";

export function isEncryptedPayload(payload: BackupPayload): boolean {
  return payload._encrypted !== undefined && !payload.notes;
}

export function encryptPayload(payload: BackupPayload, encrypt?: boolean): BackupPayload {
  const shouldEncrypt = encrypt ?? isCorporateMode();
  if (!shouldEncrypt) {
    return payload;
  }

  try {
    const json = JSON.stringify(payload);
    const encrypted = encryptSecret(json);

    return {
      version: payload.version,
      exportedAt: payload.exportedAt,
      _encrypted: encrypted
    };
  } catch (error) {
    if (error instanceof SecureStorageUnavailableError) {
      if (isCorporateMode()) {
        throw new Error(
          "Corporate mode requires encrypted backup, but secure storage is unavailable. " +
            "Ensure your system supports safeStorage or enable encryption in your security settings."
        );
      }
      return payload;
    }
    throw error;
  }
}

export function decryptPayloadOrThrow(payload: BackupPayload): BackupPayload {
  const isEncrypted = isEncryptedPayload(payload);
  if (!isEncrypted || !payload._encrypted) {
    return payload;
  }

  const decrypted = decryptSecret(payload._encrypted);
  if (!decrypted) {
    throw new Error("Failed to decrypt backup. The backup may be corrupted or was encrypted on a different system.");
  }

  try {
    return JSON.parse(decrypted) as BackupPayload;
  } catch {
    throw new Error("Failed to parse decrypted backup. The backup may be corrupted.");
  }
}

export { SecureStorageUnavailableError };
