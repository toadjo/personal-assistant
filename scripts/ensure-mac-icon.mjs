import { execSync } from "node:child_process";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const pngPath = path.join(projectRoot, "assets", "app-icon.png");
const icnsPath = path.join(projectRoot, "assets", "app-icon.icns");
const iconsetDir = path.join(projectRoot, "assets", "app-icon.iconset");

// Required sizes for .icns (macOS icon set)
const ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024];

async function fileExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function generateIconset() {
  console.log("Generating macOS iconset from source PNG...");

  if (!(await fileExists(pngPath))) {
    throw new Error(`Missing required icon source: ${pngPath}`);
  }

  // Create iconset directory
  await mkdir(iconsetDir, { recursive: true });

  // Read source image
  const sourceBuffer = await readFile(pngPath);

  // Generate all required sizes
  for (const size of ICON_SIZES) {
    const regularFilename = `icon_${size}x${size}.png`;
    const retinaFilename = `icon_${size / 2}x${size / 2}@2x.png`;

    // Regular size
    await sharp(sourceBuffer).resize(size, size).png().toFile(path.join(iconsetDir, regularFilename));

    // Retina size (2x) - only for sizes that have a half-integer equivalent
    if (size % 2 === 0 && size / 2 >= 16) {
      await sharp(sourceBuffer)
        .resize(size / 2, size / 2)
        .png()
        .toFile(path.join(iconsetDir, retinaFilename));
    }
  }

  console.log(`Generated iconset at ${iconsetDir}`);
}

async function convertIconsetToIcns() {
  console.log("Converting iconset to .icns using iconutil...");

  try {
    // iconutil is macOS-only
    execSync(`iconutil -c icns "${iconsetDir}"`, {
      cwd: projectRoot,
      stdio: "inherit"
    });
    console.log(`Generated .icns at ${icnsPath}`);
  } catch {
    throw new Error(
      `iconutil failed. This script requires macOS. On Windows, provide a pre-built assets/app-icon.icns or run on a Mac.`
    );
  }
}

async function cleanupIconset() {
  try {
    await rm(iconsetDir, { recursive: true, force: true });
    console.log("Cleaned up temporary iconset directory.");
  } catch {
    // Directory doesn't exist, nothing to clean
  }
}

async function main() {
  if (process.platform !== "darwin") {
    console.error("ERROR: macOS icon generation requires macOS platform.");
    console.error("");
    console.error("On Windows/Linux:");
    console.error("  1. Generate .icns on a Mac using: npm run icons:prepare:mac");
    console.error("  2. Commit assets/app-icon.icns to the repository");
    console.error("  3. The script will skip generation if .icns already exists");
    console.error("");
    console.error("Alternatively, use a designer-provided .icns file.");
    process.exit(1);
  }

  // Check if .icns already exists
  if (await fileExists(icnsPath)) {
    console.log(`macOS icon already exists: ${icnsPath}`);
    console.log("Skipping generation. Delete the file to regenerate.");
    return;
  }

  try {
    await generateIconset();
    await convertIconsetToIcns();
    await cleanupIconset();
    console.log("macOS icon preparation complete.");
  } catch (error) {
    await cleanupIconset();
    throw error;
  }
}

main().catch((error) => {
  console.error("Could not prepare macOS .icns icon.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
