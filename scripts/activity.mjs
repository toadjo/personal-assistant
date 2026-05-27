#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

export function runGitCommand(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: "utf-8" }).trim();
  } catch (error) {
    return `<error: ${error.message}>`;
  }
}

export function formatDirtyStatus(status) {
  if (!status || status.trim().length === 0) {
    return "(none - working directory clean)";
  }
  return status;
}

export function selectLatestActivityEntries(content, count = 3) {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const lines = content.split("\n");
  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    const match = line.match(/^## (\d{4}-\d{2}-\d{2}):/);
    if (match) {
      if (currentEntry) {
        entries.push(currentEntry.join("\n"));
      }
      currentEntry = [line];
    } else if (currentEntry) {
      currentEntry.push(line);
    }
  }

  if (currentEntry) {
    entries.push(currentEntry.join("\n"));
  }

  return entries.reverse().slice(0, count);
}

function printActivity() {
  console.log("=== Worker Activity ===\n");

  console.log("Current branch:");
  console.log("  ", runGitCommand("git rev-parse --abbrev-ref HEAD"));

  console.log("\nHEAD commit:");
  const shortSha = runGitCommand("git rev-parse --short HEAD");
  const subject = runGitCommand("git log -1 --pretty=format:%s");
  console.log(`  ${shortSha}: ${subject}`);

  console.log("\nDirty files:");
  const status = runGitCommand("git status --porcelain");
  const formatted = formatDirtyStatus(status);
  if (formatted === "(none - working directory clean)") {
    console.log("  ", formatted);
  } else {
    formatted.split("\n").forEach((line) => console.log("  ", line));
  }

  console.log("\nLatest activity entries:");
  try {
    const activityPath = join(repoRoot, "docs", "handoff", "ACTIVITY.md");
    const content = readFileSync(activityPath, "utf-8");
    const entries = selectLatestActivityEntries(content, 3);
    if (entries.length === 0) {
      console.log("  (no entries found)");
    } else {
      entries.forEach((entry) => {
        entry.split("\n").forEach((line) => console.log("  ", line));
        console.log();
      });
    }
  } catch (error) {
    console.log("  <error:", error.message, ">");
  }

  console.log("Recent commits (5):");
  const log = runGitCommand("git log --oneline -5");
  log.split("\n").forEach((line) => console.log("  ", line));

  console.log("\nActivity log:");
  console.log("  ", join(repoRoot, "docs", "handoff", "ACTIVITY.md"));

  console.log("\n=== End Activity ===");
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  printActivity();
}
