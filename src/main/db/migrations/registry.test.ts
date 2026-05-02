import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "./registry";

describe("MIGRATIONS registry", () => {
  it("uses strictly increasing versions starting at 1", () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(MIGRATIONS[0].version).toBe(1);
    for (let i = 1; i < MIGRATIONS.length; i += 1) {
      expect(MIGRATIONS[i].version).toBeGreaterThan(MIGRATIONS[i - 1].version);
    }
  });

  it("has unique version numbers and names", () => {
    const versions = new Set(MIGRATIONS.map((m) => m.version));
    const names = new Set(MIGRATIONS.map((m) => m.name));
    expect(versions.size).toBe(MIGRATIONS.length);
    expect(names.size).toBe(MIGRATIONS.length);
  });
});
