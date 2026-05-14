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
    encryptString: vi.fn((value: string) => Buffer.from(`encrypted:${value}`)),
    decryptString: vi.fn((buffer: Buffer) => buffer.toString().replace("encrypted:", ""))
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

    it("decrypts and returns content when encrypted file exists and encryption is available", () => {
      mockExistsSync.mockReturnValue(true);
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('encrypted:{"access_token":"xyz"}'));
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(result).toBe('{"access_token":"xyz"}');
      expect(mockReadFileSync).toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.enc")
      );
      expect(mockSafeStorage.decryptString).toHaveBeenCalled();
    });

    it("returns plaintext when encrypted file exists but encryption is not available", () => {
      mockExistsSync.mockReturnValue(true);
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      mockReadFileSync.mockReturnValue('{"access_token":"xyz"}');
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(result).toBe('{"access_token":"xyz"}');
      expect(mockReadFileSync).toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.enc")
      );
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it("falls back to plaintext file when encrypted does not exist", () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath.endsWith("team-session.json");
      });
      mockReadFileSync.mockReturnValue('{"access_token":"abc"}');
      const result = teamSessionStorage.getItem("supabase-auth-token");
      expect(result).toBe('{"access_token":"abc"}');
      expect(mockReadFileSync).toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.json"),
        "utf-8"
      );
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

    it("encrypts and writes to encrypted file path when encryption is available", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"def"}');
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('{"access_token":"def"}');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.enc"),
        Buffer.from('encrypted:{"access_token":"def"}')
      );
      expect(mockWriteFileSync).not.toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.json"),
        expect.anything()
      );
    });

    it("writes to plaintext file when encryption is not available", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"ghi"}');
      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(mockAppPath, "team-session.json"),
        '{"access_token":"ghi"}',
        "utf-8"
      );
    });

    it("falls back to plaintext if encrypted write fails", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockWriteFileSync
        .mockImplementationOnce(() => {
          throw new Error("Encryption failed");
        })
        .mockImplementationOnce(() => {
          // Second call (plaintext) succeeds
        });
      teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"jkl"}');
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('{"access_token":"jkl"}');
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
      expect(mockWriteFileSync).toHaveBeenNthCalledWith(
        1,
        path.join(mockAppPath, "team-session.enc"),
        Buffer.from('encrypted:{"access_token":"jkl"}')
      );
      expect(mockWriteFileSync).toHaveBeenNthCalledWith(
        2,
        path.join(mockAppPath, "team-session.json"),
        '{"access_token":"jkl"}',
        "utf-8"
      );
    });

    it("silently ignores if both encrypted and plaintext writes fail", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Disk full");
      });
      expect(() => teamSessionStorage.setItem("supabase-auth-token", '{"access_token":"mno"}')).not.toThrow();
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
