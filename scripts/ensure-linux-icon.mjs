import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

/**
 * Ensures Linux icon (PNG) exists for electron-builder Linux builds.
 * This script is cross-platform and can run on any OS.
 * Generates the icon to a non-tracked location to avoid dirtying git.
 */

const ICON_SIZE = 512;
const SOURCE_ICON = path.resolve("assets", "app-icon.png");
const GENERATED_DIR = path.resolve("assets", "generated");
const GENERATED_ICON = path.join(GENERATED_DIR, "app-icon-linux.png");
const TEMP_ICON_PATH = path.resolve("assets", ".app-icon-linux.tmp.png");

export const linuxIconConfig = {
  iconSize: ICON_SIZE,
  sourceIcon: SOURCE_ICON,
  generatedDir: GENERATED_DIR,
  generatedIcon: GENERATED_ICON,
  tempIconPath: TEMP_ICON_PATH
};

export function isExpectedLinuxIconSize(metadata, iconSize = ICON_SIZE) {
  return metadata?.width === iconSize && metadata?.height === iconSize;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureLinuxIcon() {
  console.log("Checking Linux icon...");

  if (!(await fileExists(SOURCE_ICON))) {
    throw new Error(`Missing Linux icon source: ${SOURCE_ICON}`);
  }

  try {
    // Check if generated icon already exists at correct size
    if (await fileExists(GENERATED_ICON)) {
      const metadata = await sharp(GENERATED_ICON).metadata();
      if (isExpectedLinuxIconSize(metadata, ICON_SIZE)) {
        console.log("Linux icon already generated at correct size.");
        return;
      }
    }

    console.log(`Generating Linux icon to ${GENERATED_ICON}...`);
    // Ensure generated directory exists
    await fs.mkdir(GENERATED_DIR, { recursive: true });
    // Read file into buffer first to avoid Sharp's same-file detection
    const iconBuffer = await fs.readFile(SOURCE_ICON);
    await sharp(iconBuffer).resize(ICON_SIZE, ICON_SIZE).png().toFile(TEMP_ICON_PATH);
    await fs.rename(TEMP_ICON_PATH, GENERATED_ICON);
    console.log("Linux icon ready.");
  } catch (error) {
    await fs.rm(TEMP_ICON_PATH, { force: true });
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureLinuxIcon().catch((error) => {
    console.error("Failed to generate Linux icon:", error);
    process.exit(1);
  });
}
