/**
 * Verifies that the inlined IPC channel maps in `src/main/preload.ts` match
 * the source definitions in `src/shared/ipc-channels.ts`.
 *
 * This is for drift protection since preload.ts must be self-contained at runtime
 * (sandbox mode cannot import local modules).
 *
 * Usage: `node scripts/generate-preload-ipc.mjs` [--check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "src", "shared", "ipc-channels.ts");
const preloadPath = join(root, "src", "main", "preload.ts");

function extractBlock(text, exportName) {
  const re = new RegExp(`export const ${exportName} = \\{([\\s\\S]*?)\\} as const`, "m");
  const m = text.match(re);
  if (!m) {
    throw new Error(`Could not find export const ${exportName} = { ... } as const in ${sourcePath}`);
  }
  return m[1].trim();
}

function extractInlineBlock(text, constName) {
  const re = new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\} as const`, "m");
  const m = text.match(re);
  if (!m) {
    throw new Error(`Could not find const ${constName} = { ... } as const in ${preloadPath}`);
  }
  return m[1].trim();
}

function formatObjectBody(body) {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `  ${l}`)
    .join("\n");
}

function buildInlineOutput(invokeBody, pushBody) {
  return `const invokeChannelMap = {
${formatObjectBody(invokeBody)}
} as const;

const pushChannelMap = {
${formatObjectBody(pushBody)}
} as const;

const invoke = invokeChannelMap;
const push = pushChannelMap;`;
}

const src = readFileSync(sourcePath, "utf8");
const preload = readFileSync(preloadPath, "utf8");

const invokeBody = extractBlock(src, "IpcInvoke");
const pushBody = extractBlock(src, "IpcRendererEvent");

const expectedInline = buildInlineOutput(invokeBody, pushBody);

/** Normalize CRLF so --check matches on Windows working trees (core.autocrlf). */
function normalizeLf(text) {
  return text.replace(/\r\n/g, "\n");
}

const check = process.argv.includes("--check");
if (check) {
  // Extract the inline maps from preload.ts and compare
  const preloadInvokeBody = extractInlineBlock(preload, "invokeChannelMap");
  const preloadPushBody = extractInlineBlock(preload, "pushChannelMap");
  const preloadInline = buildInlineOutput(preloadInvokeBody, preloadPushBody);

  if (normalizeLf(preloadInline) !== normalizeLf(expectedInline)) {
    console.error("Inline IPC channel maps in preload.ts are out of date with src/shared/ipc-channels.ts.");
    console.error("Run: node scripts/generate-preload-ipc.mjs to update preload.ts");
    process.exit(1);
  }
  console.log("preload.ts inline IPC channel maps are up to date.");
} else {
  // Update preload.ts with the inlined maps
  const updatedPreload = preload.replace(
    /const invokeChannelMap = \{[\s\S]*?\} as const;\s*const pushChannelMap = \{[\s\S]*?\} as const;\s*const invoke = invokeChannelMap;\s*const push = pushChannelMap;/,
    expectedInline.trim()
  );

  writeFileSync(preloadPath, updatedPreload, "utf8");
  console.log(`Updated ${preloadPath} with inline IPC channel maps from ${sourcePath}`);
}
