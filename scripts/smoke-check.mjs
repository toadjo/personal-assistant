import fs from "node:fs";
import path from "node:path";

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Smoke check failed: missing ${label} at ${filePath}`);
  }
}

function main() {
  const pkgPath = "package.json";
  assertExists(pkgPath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  assertExists("dist/main/main/main.js", "built main entry");
  assertExists("dist/main/main/preload.js", "built preload entry");
  assertExists("dist/renderer/index.html", "built renderer index");

  const mainFromPackage = pkg.main;
  if (typeof mainFromPackage !== "string" || !mainFromPackage.trim()) {
    throw new Error("Smoke check failed: package.json `main` must be a non-empty string.");
  }
  assertExists(mainFromPackage, "package.json main target");

  assertExists("scripts/ensure-win-icon.mjs", "Windows icon script");
  assertExists("scripts/ensure-linux-icon.mjs", "Linux icon script");

  const winIconPath = pkg?.build?.win?.icon;
  if (winIconPath !== "assets/app-icon.ico") {
    throw new Error(
      `Smoke check failed: build.win.icon must use assets/app-icon.ico, got ${JSON.stringify(winIconPath)}`
    );
  }
  assertExists(path.normalize("assets/app-icon.ico"), "Windows icon source");

  const nsisInclude = pkg?.build?.nsis?.include;
  if (nsisInclude !== "build/installer.nsh") {
    throw new Error(
      `Smoke check failed: build.nsis.include must use build/installer.nsh, got ${JSON.stringify(nsisInclude)}`
    );
  }
  assertExists(path.normalize("build/installer.nsh"), "NSIS shortcut icon override");

  const extraResources = Array.isArray(pkg?.build?.extraResources) ? pkg.build.extraResources : [];
  const installsShortcutIcon = extraResources.some(
    (item) => item?.from === "assets/app-icon.ico" && item?.to === "app-icon.ico"
  );
  if (!installsShortcutIcon) {
    throw new Error("Smoke check failed: build.extraResources must install assets/app-icon.ico as app-icon.ico.");
  }

  const linuxTarget = pkg?.build?.linux?.target;
  const targetList = Array.isArray(linuxTarget) ? linuxTarget : [linuxTarget];
  if (!targetList.includes("AppImage")) {
    throw new Error(`Smoke check failed: Linux target must include AppImage, got ${JSON.stringify(linuxTarget)}`);
  }

  const linuxIconPath = pkg?.build?.linux?.icon;
  if (typeof linuxIconPath !== "string" || !linuxIconPath.trim()) {
    throw new Error("Smoke check failed: build.linux.icon must be configured.");
  }
  assertExists(path.normalize("assets/app-icon.png"), "Linux icon source image");

  console.log(
    "Smoke check passed: build outputs, package entry, installer shortcut icon config, and Linux AppImage config verified."
  );
}

main();
