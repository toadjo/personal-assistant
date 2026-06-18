import { describe, expect, it } from "vitest";
import { selectReleaseAssets, validateReleaseAssets } from "./release-assets.mjs";

describe("release asset selection", () => {
  it("keeps only mirrorable release assets", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
        "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe.blockmap",
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
      "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe.blockmap",
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

  it("fails validation when .blockmap is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: ["installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe"],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/Blockmap file \(.blockmap\)/);
  });

  it("fails validation when latest.yml is missing", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe",
        "installer-history/v1.4.0/PersonalAssistant Setup 1.4.0.exe.blockmap"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/Update manifest \(latest\.yml\)/);
  });

  it("validates Windows release has required assets (.exe, .blockmap, latest.yml)", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe",
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe.blockmap",
        "installer-history/v3.1.0/latest.yml"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).not.toThrow();
  });

  it("validates Windows release has required assets (.exe, .blockmap, latest.yml)", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe",
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe.blockmap",
        "installer-history/v3.1.0/latest.yml"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).not.toThrow();
  });

  it("fails validation when Windows release is missing .blockmap", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe",
        "installer-history/v3.1.0/latest.yml"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/Blockmap file \(.blockmap\)/);
  });

  it("fails validation when Windows release is missing latest.yml", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe",
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe.blockmap"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).toThrow(/Update manifest \(latest\.yml\)/);
  });

  it("allows Windows-only releases", () => {
    const selection = selectReleaseAssets({
      windowsFiles: [
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe",
        "installer-history/v3.1.0/PersonalAssistant Setup 3.1.0.exe.blockmap",
        "installer-history/v3.1.0/latest.yml"
      ],
      linuxFiles: [],
      macosFiles: []
    });
    expect(() => validateReleaseAssets(selection)).not.toThrow();
  });
});
