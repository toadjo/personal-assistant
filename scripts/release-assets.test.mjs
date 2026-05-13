import { describe, expect, it } from "vitest";
import { selectReleaseAssets, validateReleaseAssets } from "./release-assets.mjs";

describe("release asset selection", () => {
  it("keeps only mirrorable release assets", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
        "installer-history/v1.4.0/latest.yml"
      ],
      linuxFiles: ["release/personal-assistant-1.4.0.AppImage", "release/personal-assistant-1.4.0.AppImage.zsync"],
      macosFiles: [
        "release/personal-assistant-1.4.0.dmg",
        "release/personal-assistant-1.4.0-mac.zip",
        "release/builder-debug.yml",
        "release/unpacked/some-binary",
        "README.md"
      ]
    });

    expect(selection.selected).toEqual([
      "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
      "installer-history/v1.4.0/latest.yml",
      "release/personal-assistant-1.4.0.AppImage",
      "release/personal-assistant-1.4.0.AppImage.zsync",
      "release/personal-assistant-1.4.0.dmg",
      "release/personal-assistant-1.4.0-mac.zip",
      "release/builder-debug.yml"
    ]);
  });

  it("fails validation when .exe is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [],
      linuxFiles: ["release/personal-assistant-1.4.0.AppImage"],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one Windows \.exe/);
  });

  it("fails validation when .AppImage is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: ["installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe"],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one Linux \.AppImage/);
  });

  it("fails validation when .dmg is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: ["installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe"],
      linuxFiles: ["release/personal-assistant-1.4.0.AppImage"],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one macOS \.dmg/);
  });

  it("fails validation when .zip is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: ["installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe"],
      linuxFiles: ["release/personal-assistant-1.4.0.AppImage"],
      macosFiles: ["release/personal-assistant-1.4.0.dmg"]
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one macOS \.zip/);
  });

  it("ignores a windows zip and still fails validation when macos zip is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: ["release/personal-assistant-1.4.0.exe", "release/builder-effective-config-win.zip"],
      linuxFiles: ["release/personal-assistant-1.4.0.AppImage"],
      macosFiles: ["release/personal-assistant-1.4.0.dmg"]
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/at least one macOS \.zip/);
  });
});
