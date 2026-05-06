import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Ensures Linux icon (PNG) exists for electron-builder Linux builds.
 * This script is cross-platform and can run on any OS.
 */

const ICON_SIZE = 512;
const ICON_PATH = path.resolve("assets", "app-icon.png");
const TEMP_ICON_PATH = path.resolve("assets", ".app-icon-linux.tmp.png");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureLinuxIcon() {
  console.log("Checking Linux icon...");

  if (!(await fileExists(ICON_PATH))) {
    throw new Error(`Missing Linux icon source: ${ICON_PATH}`);
  }

  try {
    // Check if icon is already the right size
    const metadata = await sharp(ICON_PATH).metadata();
    if (metadata.width === ICON_SIZE && metadata.height === ICON_SIZE) {
      console.log("Linux icon already exists at correct size.");
      return;
    }

    console.log(`Resizing Linux icon to ${ICON_SIZE}x${ICON_SIZE}...`);
    // Read file into buffer first to avoid Sharp's same-file detection
    const iconBuffer = await fs.readFile(ICON_PATH);
    await sharp(iconBuffer).resize(ICON_SIZE, ICON_SIZE).png().toFile(TEMP_ICON_PATH);
    await fs.rename(TEMP_ICON_PATH, ICON_PATH);
    console.log("Linux icon ready.");
  } catch (error) {
    await fs.rm(TEMP_ICON_PATH, { force: true });
    throw error;
  }
}

ensureLinuxIcon().catch((error) => {
  console.error("Failed to generate Linux icon:", error);
  process.exit(1);
});
