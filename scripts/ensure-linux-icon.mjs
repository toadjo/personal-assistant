import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Ensures Linux icon (PNG) exists for electron-builder Linux builds.
 * This script is cross-platform and can run on any OS.
 */

const ICON_SIZE = 512;
const SOURCE_ICON = path.join(process.cwd(), "assets", "app-icon.png");
const TARGET_ICON = path.join(process.cwd(), "assets", "app-icon.png");

async function ensureLinuxIcon() {
  console.log("Checking Linux icon...");

  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`Source icon not found: ${SOURCE_ICON}`);
    console.error("Please add app-icon.png to the assets folder.");
    process.exit(1);
  }

  try {
    // Check if icon is already the right size
    const metadata = await sharp(SOURCE_ICON).metadata();
    if (metadata.width === ICON_SIZE && metadata.height === ICON_SIZE) {
      console.log("Linux icon already exists at correct size.");
      return;
    }

    console.log(`Resizing Linux icon to ${ICON_SIZE}x${ICON_SIZE}...`);
    await sharp(SOURCE_ICON)
      .resize(ICON_SIZE, ICON_SIZE)
      .toFile(TARGET_ICON);
    console.log("Linux icon generated successfully.");
  } catch (error) {
    console.error("Failed to generate Linux icon:", error);
    process.exit(1);
  }
}

ensureLinuxIcon();
