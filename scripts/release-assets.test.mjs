import { describe, expect, it } from "vitest";
import { selectReleaseAssets, validateReleaseAssets } from "./release-assets.mjs";

describe("release asset selection", () => {
  it("keeps only mirrorable release assets", () => {
    const selection = selectReleaseAssets([
      "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
      "installer-history/v1.4.0/latest.yml",
      "release/personal-assistant-1.4.0.AppImage",
      "release/personal-assistant-1.4.0.AppImage.zsync",
      "release/builder-debug.yml",
      "release/unpacked/some-binary",
      "README.md"
    ]);

    expect(selection.selected).toEqual([
      "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
      "installer-history/v1.4.0/latest.yml",
      "release/personal-assistant-1.4.0.AppImage",
      "release/personal-assistant-1.4.0.AppImage.zsync",
      "release/builder-debug.yml"
    ]);
  });

  it("fails validation when .exe is missing", () => {
    const selection = selectReleaseAssets(["release/personal-assistant-1.4.0.AppImage"]);
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one Windows \.exe/);
  });

  it("fails validation when .AppImage is missing", () => {
    const selection = selectReleaseAssets(["installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe"]);
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one Linux \.AppImage/);
  });
});
