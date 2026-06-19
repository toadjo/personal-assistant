#!/usr/bin/env node

/**
 * Performance budget check for renderer bundle size.
 *
 * This script checks the built renderer bundle against size budgets.
 * Budgets are in kB (uncompressed).
 *
 * Usage: node scripts/check-bundle-size.mjs
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

const BUDGETS = {
  // Main bundle (index.js)
  "index.js": {
    max: 600, // kB
    warn: 550 // kB
  },
  // React chunk
  "react.js": {
    max: 200, // kB
    warn: 180 // kB
  },
  // Life areas chunk (Finance, Car, Family, Health, Hobbies)
  "life-areas.js": {
    max: 150, // kB
    warn: 120 // kB
  },
  // Vendor chunk (third-party dependencies)
  "vendor.js": {
    max: 150, // kB
    warn: 120 // kB
  }
};

function getBundleSize(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Bundle not found: ${filePath}`);
    process.exit(1);
  }
  const stats = readFileSync(filePath);
  return stats.length / 1024; // Convert to kB
}

function checkBudget(name, size, budget) {
  if (size > budget.max) {
    console.error(`❌ FAIL: ${name} is ${size.toFixed(2)} kB (budget: ${budget.max} kB)`);
    return false;
  }
  if (size > budget.warn) {
    console.warn(`⚠️  WARN: ${name} is ${size.toFixed(2)} kB (warn threshold: ${budget.warn} kB)`);
    return true;
  }
  console.log(`✅ PASS: ${name} is ${size.toFixed(2)} kB (budget: ${budget.max} kB)`);
  return true;
}

function main() {
  const distDir = resolve(process.cwd(), "dist/renderer/assets");
  let allPassed = true;

  for (const [bundleName, budget] of Object.entries(BUDGETS)) {
    // Find the actual file (it has a hash in the name)
    const files = readdirSync(distDir);
    const file = files.find((f) => f.startsWith(bundleName.replace(".js", "-")) && f.endsWith(".js"));

    if (!file) {
      console.error(`Bundle not found: ${bundleName} (hashed variant in ${distDir})`);
      allPassed = false;
      continue;
    }

    const filePath = resolve(distDir, file);
    const size = getBundleSize(filePath);
    const passed = checkBudget(bundleName, size, budget);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.error("\nBundle size budget check failed");
    process.exit(1);
  }

  console.log("\nAll bundle size budgets passed");
}

main();
