import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IpcInvoke, IpcRendererEvent } from "../shared/ipc-channels";

const root = process.cwd();
const preloadPath = join(root, "src", "main", "preload.ts");

function extractInlineBlock(text: string, constName: string): string {
  const re = new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\} as const`, "m");
  const m = text.match(re);
  if (!m || !m[1]) {
    throw new Error(`Could not find const ${constName} = { ... } as const in ${preloadPath}`);
  }
  return m[1].trim();
}

function parseObjectBody(body: string): Record<string, string> {
  const entries = body.split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .map((l: string) => {
      const match = l.match(/^(\w+):\s*"(.*)",?$/);
      if (!match) throw new Error(`Cannot parse line: ${l}`);
      return [match[1], match[2]];
    });
  return Object.fromEntries(entries);
}

describe("preload IPC channel names", () => {
  it("inline invoke map in preload.ts matches src/shared/ipc-channels.ts", () => {
    const preload = readFileSync(preloadPath, "utf8");
    const invokeBody = extractInlineBlock(preload, "invokeChannelMap");
    const parsedInvoke = parseObjectBody(invokeBody);
    expect(parsedInvoke).toEqual(IpcInvoke);
  });

  it("inline push map in preload.ts matches src/shared/ipc-channels.ts", () => {
    const preload = readFileSync(preloadPath, "utf8");
    const pushBody = extractInlineBlock(preload, "pushChannelMap");
    const parsedPush = parseObjectBody(pushBody);
    expect(parsedPush).toEqual(IpcRendererEvent);
  });
});
