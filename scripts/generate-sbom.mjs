#!/usr/bin/env node

/**
 * Generate Software Bill of Materials (SBOM) for security audit.
 *
 * This script generates an SBOM in CycloneDX JSON format listing all dependencies
 * used in the application. This is useful for security audits and vulnerability scanning.
 *
 * Usage: npm run security:sbom
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

try {
  console.log("Generating SBOM...");

  // Use npm to generate SBOM if @cyclonedx/cyclonedx-npm is available
  // Otherwise, fall back to a simple dependency list
  try {
    execSync("npx @cyclonedx/cyclonedx-npm -o sbom.json", {
      cwd: __dirname,
      stdio: "inherit"
    });
  } catch {
    // Fallback: generate simple dependency list
    console.log("@cyclonedx/cyclonedx-npm not available, generating simple dependency list...");

    const packageJsonPath = join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      version: 1,
      metadata: {
        component: {
          type: "application",
          name: "Personal Assistant",
          version: packageJson.version
        }
      },
      components: Object.entries(dependencies).map(([name, version]) => ({
        type: "library",
        name,
        version: typeof version === "string" ? version : version.version,
        purl: `pkg:npm/${name}@${typeof version === "string" ? version : version.version}`
      }))
    };

    const outputPath = join(__dirname, "..", "sbom.json");
    writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
    console.log(`SBOM generated: ${outputPath}`);
  }

  console.log("SBOM generation complete.");
} catch (error) {
  console.error("Failed to generate SBOM:", error);
  process.exit(1);
}
