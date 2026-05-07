import { describe, expect, it } from "vitest";
import { isExpectedLinuxIconSize, linuxIconConfig } from "./ensure-linux-icon.mjs";

describe("linux icon generation behavior", () => {
  it("accepts exact configured icon size", () => {
    expect(isExpectedLinuxIconSize({ width: linuxIconConfig.iconSize, height: linuxIconConfig.iconSize })).toBe(true);
  });

  it("rejects non-square or wrong-size icons", () => {
    expect(isExpectedLinuxIconSize({ width: linuxIconConfig.iconSize, height: 256 })).toBe(false);
    expect(isExpectedLinuxIconSize({ width: 256, height: linuxIconConfig.iconSize })).toBe(false);
  });
});
