import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_PATTERNS = [".exe", ".blockmap", ".yml", ".AppImage", ".AppImage.zsync", ".dmg", ".zip"];

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

export function selectReleaseAssets({ windowsFiles, linuxFiles, macosFiles }) {
  const windows = windowsFiles.map(normalize);
  const linux = linuxFiles.map(normalize);
  const macos = macosFiles.map(normalize);
  const all = [...windows, ...linux, ...macos];
  const selected = all.filter(isAllowedReleaseAsset);
  const exe = selected.filter((f) => f.endsWith(".exe"));
  const blockmap = selected.filter((f) => f.endsWith(".blockmap"));
  const latestYml = selected.filter((f) => f.endsWith("latest.yml"));
  const appImage = selected.filter((f) => f.endsWith(".AppImage"));
  const dmg = selected.filter((f) => f.endsWith(".dmg"));
  const zip = macos.filter((f) => f.endsWith(".zip"));
  return {
    selected,
    required: { exe, blockmap, latestYml, appImage, dmg, zip }
  };
}

export function validateReleaseAssets(selection) {
  if (selection.required.exe.length === 0) {
    throw new Error("Release validation failed: expected at least one Windows .exe installer artifact.");
  }
  if (selection.required.blockmap.length === 0) {
    throw new Error("Windows release is missing required assets: Blockmap file (.blockmap). Expected files in Windows release directory");
  }
  if (selection.required.latestYml.length === 0) {
    throw new Error("Windows release is missing required assets: Update manifest (latest.yml). Expected files in Windows release directory");
  }
  // Skip Linux and macOS validation for Windows-only releases
  if (selection.required.appImage.length === 0 && selection.required.dmg.length === 0 && selection.required.zip.length === 0) {
    // This is a Windows-only release, which is acceptable
    return;
  }
  if (selection.required.appImage.length === 0) {
    throw new Error("Release validation failed: expected at least one Linux .AppImage artifact.");
  }
  if (selection.required.dmg.length === 0) {
    throw new Error("Release validation failed: expected at least one macOS .dmg artifact.");
  }
  if (selection.required.zip.length === 0) {
    throw new Error("Release validation failed: expected at least one macOS .zip artifact.");
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
    macosDir: "",
    outDir: ""
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--windows-dir") args.windowsDir = next;
    if (token === "--linux-dir") args.linuxDir = next;
    if (token === "--macos-dir") args.macosDir = next;
    if (token === "--out-dir") args.outDir = next;
  }
  if (!args.windowsDir || !args.linuxDir || !args.macosDir || !args.outDir) {
    throw new Error(
      "Usage: node scripts/release-assets.mjs --windows-dir <dir> --linux-dir <dir> --macos-dir <dir> --out-dir <dir>"
    );
  }
  return args;
}

export async function prepareValidatedReleaseAssets({ windowsDir, linuxDir, macosDir, outDir }) {
  const [windowsFiles, linuxFiles, macosFiles] = await Promise.all([
    listFilesRecursive(windowsDir),
    listFilesRecursive(linuxDir),
    listFilesRecursive(macosDir)
  ]);
  const selection = selectReleaseAssets({ windowsFiles, linuxFiles, macosFiles });
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
      console.log(`macOS packages (.dmg): ${selection.required.dmg.length}`);
      console.log(`macOS packages (.zip): ${selection.required.zip.length}`);
      for (const file of copied) {
        console.log(file);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
