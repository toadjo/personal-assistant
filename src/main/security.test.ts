import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPathInsideTrustedRoot } from "./security";

describe("isPathInsideTrustedRoot", () => {
  const root = path.join(os.tmpdir(), "personal-assistant-security-test", "app", "dist", "renderer");

  it("allows a file directly under the trusted root", () => {
    expect(isPathInsideTrustedRoot(path.join(root, "index.html"), root)).toBe(true);
  });

  it("allows the root directory itself", () => {
    expect(isPathInsideTrustedRoot(root, root)).toBe(true);
  });

  it("rejects normalized traversal above the root", () => {
    const escaped = path.normalize(path.join(root, "..", "..", "electron", "preload.cjs"));
    expect(isPathInsideTrustedRoot(escaped, root)).toBe(false);
  });

  it("rejects a normalized path outside the root tree", () => {
    const outside = path.join(os.tmpdir(), "personal-assistant-security-test", "app", "electron", "preload.cjs");
    expect(isPathInsideTrustedRoot(outside, root)).toBe(false);
  });

  it("rejects non-absolute candidate paths", () => {
    expect(isPathInsideTrustedRoot(path.join("dist", "renderer", "index.html"), root)).toBe(false);
  });

  it("rejects non-absolute trusted roots", () => {
    expect(isPathInsideTrustedRoot(path.join(root, "index.html"), path.join("dist", "renderer"))).toBe(false);
  });
});
