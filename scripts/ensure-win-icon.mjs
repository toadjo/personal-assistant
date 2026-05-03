import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const pngPath = path.join(projectRoot, "assets", "app-icon.png");
const icoPath = path.join(projectRoot, "assets", "app-icon.ico");

async function fileExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

/** Normalize `assets/app-icon.png` to real PNG bytes (file may be JPEG with a .png name). */
async function decodeRasterToPng(sourceBytes) {
  const isPng =
    sourceBytes.length >= 8 &&
    sourceBytes[0] === 0x89 &&
    sourceBytes[1] === 0x50 &&
    sourceBytes[2] === 0x4e &&
    sourceBytes[3] === 0x47;
  if (isPng) return sourceBytes;

  const isJpeg = sourceBytes[0] === 0xff && sourceBytes[1] === 0xd8;
  if (isJpeg) {
    return await sharp(sourceBytes).png().toBuffer();
  }

  throw new Error(
    "assets/app-icon.png must contain PNG or JPEG image bytes (or replace with a valid ICO via the ICO branch)."
  );
}

async function main() {
  const hasPng = await fileExists(pngPath);
  if (!hasPng) {
    throw new Error(`Missing required icon source: ${pngPath}`);
  }

  await mkdir(path.dirname(icoPath), { recursive: true });
  // Rebuild .ico for every run: NSIS requires a valid multi-size ICO; committed .ico files can be invalid.
  const sourceBytes = await readFile(pngPath);
  const isIcoFile =
    sourceBytes.length >= 4 &&
    sourceBytes[0] === 0x00 &&
    sourceBytes[1] === 0x00 &&
    sourceBytes[2] === 0x01 &&
    sourceBytes[3] === 0x00;

  if (isIcoFile) {
    await writeFile(icoPath, sourceBytes);
    console.log(`Created Windows icon from existing ICO-formatted source: ${path.relative(projectRoot, icoPath)}`);
    console.log(
      "Source file appears to be ICO bytes with a .png filename; consider replacing assets/app-icon.png with a true PNG file."
    );
    return;
  }

  const pngBytes = await decodeRasterToPng(sourceBytes);
  const iconBuffer = await pngToIco(pngBytes);
  await writeFile(icoPath, iconBuffer);
  console.log(`Generated Windows icon: ${path.relative(projectRoot, icoPath)}`);
  console.log(
    "If the generated .ico is not visually correct, replace assets/app-icon.ico with a designer-provided multi-size icon."
  );
}

main().catch((error) => {
  console.error("Could not prepare Windows .ico icon.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
