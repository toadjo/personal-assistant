import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPathInsideTrustedRoot } from "./security";

describe("isPathInsideTrustedRoot", () => {
  const root = path.normalize("C:/Users/me/app/dist/renderer");

  it("allows a file directly under the trusted root", () => {
    expect(isPathInsideTrustedRoot(path.normalize(`${root}/index.html`), root)).toBe(true);
  });

  it("allows the root directory itself", () => {
    expect(isPathInsideTrustedRoot(root, root)).toBe(true);
  });

  it("rejects normalized traversal above the root", () => {
    const escaped = path.normalize(`${root}/../../electron/preload.cjs`);
    expect(isPathInsideTrustedRoot(escaped, root)).toBe(false);
  });

  it("rejects a normalized path outside the root tree", () => {
    const outside = path.normalize("C:/Users/me/app/electron/preload.cjs");
    expect(isPathInsideTrustedRoot(outside, root)).toBe(false);
  });

  it("rejects non-absolute candidate paths", () => {
    expect(isPathInsideTrustedRoot("dist/renderer/index.html", root)).toBe(false);
  });

  it("rejects non-absolute trusted roots", () => {
    expect(isPathInsideTrustedRoot(path.normalize(`${root}/index.html`), "dist/renderer")).toBe(false);
  });
});
