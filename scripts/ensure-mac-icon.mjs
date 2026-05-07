import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const pngPath = path.join(projectRoot, "assets", "app-icon.png");
const icnsPath = path.join(projectRoot, "assets", "app-icon.icns");

export const macIconConfig = {
  sourceIcon: pngPath,
  generatedIcon: icnsPath
};

export const icnsEntries = [
  { type: "icp4", size: 16 },
  { type: "icp5", size: 32 },
  { type: "icp6", size: 64 },
  { type: "ic07", size: 128 },
  { type: "ic08", size: 256 },
  { type: "ic09", size: 512 },
  { type: "ic10", size: 1024 }
];

async function fileExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function buildIcnsBuffer(sourceBuffer) {
  const chunks = [];
  let totalLength = 8;

  for (const entry of icnsEntries) {
    const png = await sharp(sourceBuffer).resize(entry.size, entry.size).png().toBuffer();
    const header = Buffer.alloc(8);
    header.write(entry.type, 0, 4, "ascii");
    header.writeUInt32BE(png.length + 8, 4);
    chunks.push(header, png);
    totalLength += header.length + png.length;
  }

  const fileHeader = Buffer.alloc(8);
  fileHeader.write("icns", 0, 4, "ascii");
  fileHeader.writeUInt32BE(totalLength, 4);
  return Buffer.concat([fileHeader, ...chunks], totalLength);
}

async function generateIcns() {
  if (!(await fileExists(pngPath))) {
    throw new Error(`Missing required icon source: ${pngPath}`);
  }

  console.log("Generating macOS .icns from source PNG...");
  const sourceBuffer = await readFile(pngPath);
  await writeFile(icnsPath, await buildIcnsBuffer(sourceBuffer));
  console.log(`Generated .icns at ${icnsPath}`);
}

async function main() {
  if (await fileExists(icnsPath)) {
    console.log(`macOS icon already exists: ${icnsPath}`);
    console.log("Skipping generation. Delete the file to regenerate.");
    return;
  }

  await generateIcns();
  console.log("macOS icon preparation complete.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Could not prepare macOS .icns icon.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
