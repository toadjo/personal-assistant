#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

function runGitCommand(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: "utf-8" }).trim();
  } catch (error) {
    return `<error: ${error.message}>`;
  }
}

function getPackageVersion() {
  try {
    const pkgPath = join(repoRoot, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version;
  } catch (error) {
    return `<error: ${error.message}>`;
  }
}

console.log("=== Worker Handoff Info ===\n");

console.log("Current branch:");
console.log("  ", runGitCommand("git rev-parse --abbrev-ref HEAD"));

console.log("\nTracking branch:");
console.log("  ", runGitCommand("git rev-parse --abbrev-ref --symbolic-full-name @{u}"));

console.log("\nHEAD commit:");
console.log("  ", runGitCommand("git rev-parse HEAD"));

console.log("\nPackage version:");
console.log("  ", getPackageVersion());

console.log("\nDirty files:");
const status = runGitCommand("git status --porcelain");
if (status) {
  status.split("\n").forEach((line) => console.log("  ", line));
} else {
  console.log("  (none - working directory clean)");
}

console.log("\nRecent commits (5):");
const log = runGitCommand("git log --oneline -5");
log.split("\n").forEach((line) => console.log("  ", line));

console.log("\nHandoff file:");
console.log("  ", join(repoRoot, "WORKER_HANDOFF.md"));

console.log("\nActivity log:");
console.log("  ", join(repoRoot, "WORKER_ACTIVITY.md"));

console.log("\n=== End Handoff Info ===");
