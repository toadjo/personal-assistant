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
const viteEnvPath = join(root, "src", "renderer", "vite-env.d.ts");

/** Renderer-only invoke channels (no `window.assistantApi` entry). */
const RENDERER_EXCLUDED_METHOD_NAMES = new Set(["getSecurityPolicy"]);

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

function extractMethodNamesBlock(text, exportName) {
  const re = new RegExp(`export const ${exportName} = \\{([\\s\\S]*?)\\} as const`, "m");
  const m = text.match(re);
  if (!m) {
    throw new Error(`Could not find export const ${exportName} in ${sourcePath}`);
  }
  return m[1].trim();
}

function parseMethodNamesObject(body) {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => {
      const match = l.match(/^(\w+):\s*"(.*)",?$/);
      if (!match) throw new Error(`Cannot parse IpcInvokeMethodNames line: ${l}`);
      return match[2];
    });
}

function extractViteAssistantApiMethodNames(text) {
  const blockMatch = text.match(/assistantApi:\s*\{([\s\S]*?)\n {4}\};/);
  if (!blockMatch) {
    throw new Error(`Could not find assistantApi block in ${viteEnvPath}`);
  }
  const nonInvoke = new Set(["onRemindersUpdated", "onCommand", "onShowAbout", "onTeamDataUpdated"]);
  return [
    ...blockMatch[1].matchAll(/^ {6}([a-zA-Z][a-zA-Z0-9]*):/gm)
  ]
    .map((m) => m[1])
    .filter((name) => !nonInvoke.has(name));
}

function assertViteEnvMethodNameParity() {
  const channelsSrc = readFileSync(sourcePath, "utf8");
  const viteEnv = readFileSync(viteEnvPath, "utf8");
  const methodNamesBody = extractMethodNamesBlock(channelsSrc, "IpcInvokeMethodNames");
  const mappedNames = parseMethodNamesObject(methodNamesBody);
  const expectedRenderer = mappedNames.filter((name) => !RENDERER_EXCLUDED_METHOD_NAMES.has(name));
  const viteNames = extractViteAssistantApiMethodNames(viteEnv);

  const expectedSet = new Set(expectedRenderer);
  const viteSet = new Set(viteNames);

  const missingInVite = expectedRenderer.filter((name) => !viteSet.has(name));
  const extraInVite = viteNames.filter((name) => !expectedSet.has(name));

  if (missingInVite.length > 0 || extraInVite.length > 0) {
    console.error("IPC method-name drift between IpcInvokeMethodNames and vite-env.d.ts:");
    if (missingInVite.length > 0) {
      console.error("  In IpcInvokeMethodNames but missing from vite-env.d.ts:", missingInVite.join(", "));
    }
    if (extraInVite.length > 0) {
      console.error("  In vite-env.d.ts but missing from IpcInvokeMethodNames:", extraInVite.join(", "));
    }
    process.exit(1);
  }
  console.log("vite-env.d.ts assistantApi invoke methods match IpcInvokeMethodNames.");
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
  assertViteEnvMethodNameParity();
} else {
  assertViteEnvMethodNameParity();
  // Update preload.ts with the inlined maps
  const updatedPreload = preload.replace(
    /const invokeChannelMap = \{[\s\S]*?\} as const;\s*const pushChannelMap = \{[\s\S]*?\} as const;\s*const invoke = invokeChannelMap;\s*const push = pushChannelMap;/,
    expectedInline.trim()
  );

  writeFileSync(preloadPath, updatedPreload, "utf8");
  console.log(`Updated ${preloadPath} with inline IPC channel maps from ${sourcePath}`);
}
