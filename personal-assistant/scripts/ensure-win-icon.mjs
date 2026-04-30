import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

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

async function main() {
  const hasPng = await fileExists(pngPath);
  if (!hasPng) {
    throw new Error(`Missing required icon source: ${pngPath}`);
  }

  const hasIco = await fileExists(icoPath);
  if (hasIco) {
    console.log(`Windows icon already present: ${path.relative(projectRoot, icoPath)}`);
    return;
  }

  await mkdir(path.dirname(icoPath), { recursive: true });
  const sourceBytes = await readFile(pngPath);
  const isIcoFile = sourceBytes.length >= 4
    && sourceBytes[0] === 0x00
    && sourceBytes[1] === 0x00
    && sourceBytes[2] === 0x01
    && sourceBytes[3] === 0x00;

  if (isIcoFile) {
    await writeFile(icoPath, sourceBytes);
    console.log(`Created Windows icon from existing ICO-formatted source: ${path.relative(projectRoot, icoPath)}`);
    console.log("Source file appears to be ICO bytes with a .png filename; consider replacing assets/app-icon.png with a true PNG file.");
    return;
  }

  try {
    const iconBuffer = await pngToIco(sourceBytes);
    await writeFile(icoPath, iconBuffer);
    console.log(`Generated Windows icon: ${path.relative(projectRoot, icoPath)}`);
    console.log("If the generated .ico is not visually correct, replace assets/app-icon.ico with a designer-provided multi-size icon.");
  } catch {
    throw new Error(
      "assets/app-icon.png is not a valid PNG source and could not be converted. " +
      "Workaround: add a valid assets/app-icon.ico manually (preferred multi-size icon: 16/24/32/48/64/128/256) " +
      "or replace assets/app-icon.png with a real PNG and rerun npm run icons:prepare."
    );
  }
}

main().catch((error) => {
  console.warn("Could not auto-prepare Windows .ico icon.");
  console.warn(error instanceof Error ? error.message : String(error));
  console.warn("Packaging can continue with project-local PNG icon paths; add assets/app-icon.ico manually for best Windows icon fidelity.");
});
