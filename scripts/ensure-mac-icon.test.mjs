import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildIcnsBuffer, icnsEntries, macIconConfig } from "./ensure-mac-icon.mjs";

function readEntryTypes(buffer) {
  const types = [];
  let offset = 8;
  while (offset < buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32BE(offset + 4);
    types.push(type);
    offset += length;
  }
  return types;
}

describe("mac icon generation behavior", () => {
  it("builds a valid ICNS container with expected PNG icon entries", async () => {
    const source = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: "#2457ff"
      }
    })
      .png()
      .toBuffer();

    const icns = await buildIcnsBuffer(source);

    expect(icns.toString("ascii", 0, 4)).toBe("icns");
    expect(icns.readUInt32BE(4)).toBe(icns.length);
    expect(readEntryTypes(icns)).toEqual(icnsEntries.map((entry) => entry.type));
  });

  it("targets the electron-builder macOS icon path", () => {
    expect(macIconConfig.generatedIcon.replace(/\\/g, "/")).toMatch(/assets\/app-icon\.icns$/);
  });
});
