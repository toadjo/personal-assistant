import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import electron from "electron";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, "preload-smoke-app");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.NODE_OPTIONS;

const child = spawn(electron, [appDir], {
  stdio: "inherit",
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Preload smoke launcher: Electron terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error("Preload smoke launcher failed to start Electron:", err);
  process.exit(1);
});
