const { spawn } = require("node:child_process");
const path = require("node:path");

const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

async function globalSetup(_config) {
  console.log("[Electron E2E] Building project...");

  const buildProcess = spawn("npm", ["run", "build"], {
    cwd: repoRoot,
    shell: true,
    stdio: "inherit"
  });

  await new Promise((resolve, reject) => {
    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log("[Electron E2E] Build completed");
        resolve();
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });
  });

  process.env.ELECTRON_E2E_BUILD_PATH = path.join(repoRoot, "dist");
}

module.exports = globalSetup;
