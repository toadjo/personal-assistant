#!/usr/bin/env node

/**
 * Generate release evidence for security audit.
 *
 * This script collects evidence for a release including:
 * - Git commit SHA
 * - Build timestamp
 * - Package version
 * - Dependency list
 * - Build configuration
 *
 * Usage: npm run security:release-evidence
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

try {
  console.log("Generating release evidence...");

  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  let gitSha = "unknown";
  let gitBranch = "unknown";
  let gitCommitDate = "unknown";

  try {
    gitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
    gitCommitDate = execSync("git log -1 --format=%ci", { encoding: "utf8" }).trim();
  } catch {
    console.log("Git information not available (not in git repo)");
  }

  const evidence = {
    release: {
      version: packageJson.version,
      name: packageJson.name,
      timestamp: new Date().toISOString(),
      buildEnvironment: process.env.NODE_ENV || "production"
    },
    git: {
      commitSha: gitSha,
      branch: gitBranch,
      commitDate: gitCommitDate
    },
    dependencies: {
      production: packageJson.dependencies,
      development: packageJson.devDependencies
    },
    build: packageJson.build,
    engines: packageJson.engines
  };

  const outputPath = join(__dirname, "..", "release-evidence.json");
  writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
  console.log(`Release evidence generated: ${outputPath}`);

  console.log("Release evidence generation complete.");
} catch (error) {
  console.error("Failed to generate release evidence:", error);
  process.exit(1);
}
