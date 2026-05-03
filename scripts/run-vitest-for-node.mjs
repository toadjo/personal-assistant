/**
 * Vitest runs under system Node, but the app uses Electron. `npm rebuild better-sqlite3`
 * produces a Node ABI binary, which breaks `electron .` until native modules are rebuilt for Electron.
 *
 * This script: rebuild for Node → codegen → vitest → always restore Electron (`install-app-deps`).
 *
 * Usage: `node scripts/run-vitest-for-node.mjs run [-- vitest flags]`
 *         `node scripts/run-vitest-for-node.mjs watch [-- vitest flags]`
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Aligns with package.json `engines.node` (e.g. ">=20.0.0 <24.0.0") so Node 24+ fails before node-gyp / VS errors. */
function assertSupportedNodeForTests() {
  let enginesNode;
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    enginesNode = pkg.engines?.node;
  } catch {
    return;
  }
  if (!enginesNode || typeof enginesNode !== "string") return;

  const major = Number.parseInt(process.version.slice(1).split(".")[0], 10);
  const minM = enginesNode.match(/>=\s*(\d+)/);
  const maxExclusiveM = enginesNode.match(/<\s*(\d+)/);
  const minMajor = minM ? Number.parseInt(minM[1], 10) : 0;
  const maxExclusiveMajor = maxExclusiveM ? Number.parseInt(maxExclusiveM[1], 10) : 999;

  if (Number.isFinite(major) && (major < minMajor || major >= maxExclusiveMajor)) {
    console.error(`\n[test] Node ${process.version} is outside package.json engines: ${enginesNode}`);
    console.error("[test] Vitest rebuilds better-sqlite3 for your Node version; Node 24+ has no Windows prebuild, so npm falls back to node-gyp and Visual Studio.");
    console.error("[test] Use Node 22 LTS (matches CI), e.g. nvm-windows: nvm install 22 && nvm use 22\n");
    process.exit(1);
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...opts
  });
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status ?? 0;
}

function rebuildForElectron() {
  console.log("\n[test] Restoring better-sqlite3 for Electron (electron-rebuild -f -w better-sqlite3)…\n");
  return run("npm", ["run", "rebuild:electron"]);
}

const mode = process.argv[2] || "run";
const vitestArgs = process.argv.slice(3);

assertSupportedNodeForTests();

let exitCode = 1;
try {
  exitCode = run("npm", ["rebuild", "better-sqlite3"]);
  if (exitCode !== 0) {
    console.error("[test] npm rebuild better-sqlite3 failed.");
  } else {
    exitCode = run("node", ["scripts/generate-preload-ipc.mjs"]);
    if (exitCode !== 0) {
      console.error("[test] Preload IPC codegen failed.");
    } else if (mode === "watch") {
      exitCode = run("npx", ["vitest", ...vitestArgs]);
    } else if (mode === "run") {
      exitCode = run("npx", ["vitest", "run", ...vitestArgs]);
    } else {
      console.error("Usage: node scripts/run-vitest-for-node.mjs <run|watch> [-- vitest options]");
      exitCode = 2;
    }
  }
} finally {
  const restoreCode = rebuildForElectron();
  if (restoreCode !== 0) {
    console.error("[test] npm run rebuild:electron failed. Run it manually before `npm run dev`.");
    if (exitCode === 0) exitCode = restoreCode;
  }
}

process.exit(exitCode);
