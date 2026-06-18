import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnvFile } from "./loadEnvFile";

describe("loadEnvFile", () => {
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), "pa-env-"));
    process.chdir(tempDir);
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    delete process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    delete process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  });

  it("loads calendar OAuth keys from .env without overriding existing env", () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "already-set";
    writeFileSync(
      join(tempDir, ".env"),
      [
        "GOOGLE_CALENDAR_CLIENT_ID=from-dotenv",
        "GOOGLE_CALENDAR_CLIENT_SECRET=google-secret",
        "MICROSOFT_CALENDAR_CLIENT_ID=microsoft-id",
        "# comment",
        "",
        'QUOTED="value"'
      ].join("\n")
    );

    loadEnvFile();

    expect(process.env.GOOGLE_CALENDAR_CLIENT_ID).toBe("already-set");
    expect(process.env.GOOGLE_CALENDAR_CLIENT_SECRET).toBe("google-secret");
    expect(process.env.MICROSOFT_CALENDAR_CLIENT_ID).toBe("microsoft-id");
  });
});
