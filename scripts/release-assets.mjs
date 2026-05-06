import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_PATTERNS = [".exe", ".blockmap", ".yml", ".AppImage", ".AppImage.zsync"];

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function isAllowedReleaseAsset(filePath) {
  return ALLOWED_PATTERNS.some((suffix) => filePath.endsWith(suffix));
}

async function listFilesRecursive(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) out.push(fullPath);
    }
  }
  return out;
}

export function selectReleaseAssets(filePaths) {
  const normalized = filePaths.map(normalize);
  const selected = normalized.filter(isAllowedReleaseAsset);
  const exe = selected.filter((f) => f.endsWith(".exe"));
  const appImage = selected.filter((f) => f.endsWith(".AppImage"));
  return {
    selected,
    required: { exe, appImage }
  };
}

export function validateReleaseAssets(selection) {
  if (selection.required.exe.length === 0) {
    throw new Error("Release validation failed: expected at least one Windows .exe installer artifact.");
  }
  if (selection.required.appImage.length === 0) {
    throw new Error("Release validation failed: expected at least one Linux .AppImage artifact.");
  }
}

async function copySelectedAssets(selected, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const copied = [];
  for (const source of selected) {
    const fileName = path.basename(source);
    const target = path.join(outDir, fileName);
    await fs.copyFile(source, target);
    copied.push(target);
  }
  return copied;
}

function parseArgs(argv) {
  const args = {
    windowsDir: "",
    linuxDir: "",
    outDir: ""
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--windows-dir") args.windowsDir = next;
    if (token === "--linux-dir") args.linuxDir = next;
    if (token === "--out-dir") args.outDir = next;
  }
  if (!args.windowsDir || !args.linuxDir || !args.outDir) {
    throw new Error("Usage: node scripts/release-assets.mjs --windows-dir <dir> --linux-dir <dir> --out-dir <dir>");
  }
  return args;
}

export async function prepareValidatedReleaseAssets({ windowsDir, linuxDir, outDir }) {
  const [windowsFiles, linuxFiles] = await Promise.all([listFilesRecursive(windowsDir), listFilesRecursive(linuxDir)]);
  const selection = selectReleaseAssets([...windowsFiles, ...linuxFiles]);
  validateReleaseAssets(selection);
  const copied = await copySelectedAssets(selection.selected, outDir);
  return { copied, selection };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareValidatedReleaseAssets(parseArgs(process.argv.slice(2)))
    .then(({ copied, selection }) => {
      console.log(`Validated release assets: ${selection.selected.length}`);
      console.log(`Windows installers (.exe): ${selection.required.exe.length}`);
      console.log(`Linux packages (.AppImage): ${selection.required.appImage.length}`);
      for (const file of copied) {
        console.log(file);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
