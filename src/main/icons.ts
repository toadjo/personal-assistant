import path from "node:path";
import { existsSync } from "node:fs";
import { app, nativeImage } from "electron";

export function resolveAppIconPath(): string | undefined {
  const assetRoot = app.isPackaged ? path.join(app.getAppPath(), "assets") : path.join(process.cwd(), "assets");
  const candidates = [path.join(assetRoot, "app-icon.png"), path.join(assetRoot, "app-icon.ico")];
  return candidates.find((candidate) => existsSync(candidate));
}

export function createTrayIcon() {
  const appIconPath = resolveAppIconPath();
  if (appIconPath) {
    const icon = nativeImage.createFromPath(appIconPath);
    if (!icon.isEmpty()) {
      return icon;
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#1d4ed8"/>
      <path d="M4 8h8M8 4v8" stroke="#dbeafe" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `.trim();
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}
