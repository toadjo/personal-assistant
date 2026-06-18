/**
 * Tests for Supabase auth session storage adapter.
 *
 * We mock Electron's app.getPath and fs to avoid touching the real filesystem.
 * Encryption behavior is simulated via a mock safeStorage.
 */

import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockAppPath = "C:/Users/test/appdata";
const { mockExistsSync, mockReadFileSync, mockWriteFileSync, mockUnlinkSync, mockSafeStorage } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockSafeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => {
      const base64 = Buffer.from(plain).toString("base64");
      return Buffer.from(`sse1:${base64}`);
    }),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString("utf-8");
      if (str.startsWith("sse1:")) {
        const base64 = str.slice(5);
        return Buffer.from(base64, "base64");
      }
      return Buffer.from(str);
    })
  }
}));

vi.mock("electron", () => ({
  app: { getPath: () => mockAppPath },
  safeStorage: mockSafeStorage
}));

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync
}));

import { teamSessionStorage } from "./sessionStorage";

describe("teamSessionStorage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default behavior
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockImplementation((plain: string) => {
      const base64 = Buffer.from(plain).toString("base64");
      return Buffer.from(`sse1:${base64}`);
    });
    mockSafeStorage.decryptString.mockImplementation((buffer: Buffer) => {
      const str = buffer.toString("utf-8");
      if (str.startsWith("sse1:")) {
        const base64 = str.slice(5);
        return Buffer.from(base64, "base64");
      }
      return Buffer.from(str);
    });
  });

  describe("getItem", () => {
    it("returns null for unknown keys", () => {
      expect(teamSessionStorage.getItem("unknown-key")).toBeNull();
    });

    it("returns null when session file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(teamSessionStorage.getItem("supabase-auth-token")).toBeNull();
    });

    it("returns null when file read throws", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("EACCES");
      });
      expect(teamSessionStorage.getItem("supabase-auth-token")).toBeNull();
    });

    it.skip("decrypts and returns content when encrypted file exists", () => {
      mockExistsSync.mockReturnValue(true);
      const rawBuffer = Buffer.from('{"access_token":"xyz"}');
      mockReadFileSync.mockReturnValue(rawBuffer);
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(mockSafeStorage.decryptString).toHaveBeenCalled();
      expect(result).toBe('{"access_token":"xyz"}');
    });

    it("returns null when decryptSecret fails", () => {
      mockExistsSync.mockReturnValue(true);
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error("Decrypt failed");
      });
      const rawBuffer = Buffer.from('{"access_token":"xyz"}');
      mockReadFileSync.mockReturnValue(rawBuffer);
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(result).toBeNull();
    });

    it("returns null when plaintext file exists (legacy plaintext rejected)", () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith("team-session.json");
      });
      mockReadFileSync.mockReturnValue('{"access_token":"abc"}');
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(result).toBeNull();
    });
  });

  describe("setItem", () => {
    it("ignores unknown keys", () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Should not be called");
      });
      teamSessionStorage.setItem("unknown-key", "value");
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it.skip("encrypts and writes to encrypted file path", () => {
      teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"def"}');
      expect(mockSafeStorage.encryptString).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("throws when encryption is not available", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      expect(() => teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"ghi"}')).toThrow(
        "Secure storage (OS encryption) is required to save API keys and tokens. Please ensure your system supports secure storage."
      );
    });

    it("throws if writeFileSync fails", () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Disk full");
      });
      expect(() => teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"jkl"}')).toThrow(
        "Failed to save team session."
      );
    });
  });

  describe("removeItem", () => {
    it("ignores unknown keys", () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("Should not be called");
      });
      teamSessionStorage.removeItem("unknown-key");
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it("deletes both encrypted and plaintext files", () => {
      teamSessionStorage.removeItem("supabase-auth-token");
      expect(mockUnlinkSync).toHaveBeenCalledWith(path.join(mockAppPath, "team-session.enc"));
      expect(mockUnlinkSync).toHaveBeenCalledWith(path.join(mockAppPath, "team-session.json"));
    });

    it("ignores errors when files do not exist", () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(() => teamSessionStorage.removeItem("supabase-auth-token")).not.toThrow();
    });
  });
});
