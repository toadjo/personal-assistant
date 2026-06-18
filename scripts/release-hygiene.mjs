#!/usr/bin/env node

/**
 * Release Hygiene Check
 *
 * This script performs basic release hygiene checks before building a release.
 * Run this before creating a release to catch common issues.
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const changelog = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");

let hasErrors = false;

function check(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

function runCommand(command) {
  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("🔍 Running Release Hygiene Checks...\n");

// Check 1: Git status
console.log("Checking git status...");
const gitStatus = execSync("git status --porcelain", { encoding: "utf8" });
check(gitStatus.trim() === "", "Working directory is clean (no uncommitted changes)");

// Check 2: Version in package.json
console.log("\nChecking version...");
const version = packageJson.version;
check(/^\d+\.\d+\.\d+$/.test(version), `Version format is valid: ${version}`);

// Check 3: Changelog has entry for current version
console.log("\nChecking changelog...");
const versionHeader = `## [${version}]`;
check(changelog.includes(versionHeader), `CHANGELOG.md has entry for version ${version}`);

// Check 4: No TODO comments in production code
console.log("\nChecking for TODO comments...");
try {
  const todoCount = execSync("grep -r 'TODO' src/ --include='*.ts' --include='*.tsx' | wc -l", { encoding: "utf8" });
  check(parseInt(todoCount.trim()) === 0, "No TODO comments in production code");
} catch {
  console.log("⚠️  Could not check for TODO comments (grep not available)");
}

// Check 5: Lint passes
console.log("\nRunning linter...");
const lintPassed = runCommand("npm run lint");
check(lintPassed, "ESLint passes");

// Check 6: Typecheck passes
console.log("\nRunning typecheck...");
const typecheckPassed = runCommand("npm run typecheck");
check(typecheckPassed, "TypeScript type checking passes");

// Check 7: Tests pass
console.log("\nRunning tests...");
const testsPassed = runCommand("npm test");
check(testsPassed, "All tests pass");

// Check 8: Build succeeds
console.log("\nRunning build...");
const buildPassed = runCommand("npm run build");
check(buildPassed, "Production build succeeds");

console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.error("❌ Release hygiene checks failed. Please fix the issues above.");
  process.exit(1);
} else {
  console.log("✅ All release hygiene checks passed!");
  console.log("You're ready to proceed with the release.");
  process.exit(0);
}
