import { FullConfig } from "@playwright/test";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalSetup(_config: FullConfig) {
  console.log("[Electron E2E] Global setup: building project for Electron tests...");

  // Build the project before running Electron E2E tests
  const buildProcess = spawn("npm", ["run", "build"], {
    cwd: path.join(__dirname, "..", ".."),
    shell: true,
    stdio: "inherit"
  });

  await new Promise<void>((resolve, reject) => {
    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log("[Electron E2E] Build completed successfully");
        resolve();
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });
  });

  // Store the build path for tests to use
  process.env.ELECTRON_E2E_BUILD_PATH = path.join(__dirname, "..", "..", "dist");
  console.log("[Electron E2E] Build path set:", process.env.ELECTRON_E2E_BUILD_PATH);
}

export default globalSetup;
