/**
 * Deletes `release/` so electron-builder can repackage. Windows often locks
 * `release/win-unpacked/resources/app.asar` if PersonalAssistant.exe or dev Electron is still running.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const releaseDir = join(process.cwd(), "release");

if (!existsSync(releaseDir)) {
  process.exit(0);
}

try {
  rmSync(releaseDir, { recursive: true, force: true });
  console.log("Removed release/ for a clean package output.");
} catch (err) {
  console.error("Could not delete release/ (files may be in use).");
  console.error("Quit Personal Assistant, any Electron dev instance, and Explorer windows under release/, then retry.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
