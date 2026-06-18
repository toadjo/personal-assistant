import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "./registry";

describe("MIGRATIONS registry", () => {
  it("uses strictly increasing versions starting at 1", () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    const first = MIGRATIONS[0];
    expect(first).toBeDefined();
    expect(first!.version).toBe(1);
    for (let i = 1; i < MIGRATIONS.length; i += 1) {
      const cur = MIGRATIONS[i];
      const prev = MIGRATIONS[i - 1];
      expect(cur).toBeDefined();
      expect(prev).toBeDefined();
      expect(cur!.version).toBeGreaterThan(prev!.version);
    }
  });

  it("has unique version numbers and names", () => {
    const versions = new Set(MIGRATIONS.map((m) => m.version));
    const names = new Set(MIGRATIONS.map((m) => m.name));
    expect(versions.size).toBe(MIGRATIONS.length);
    expect(names.size).toBe(MIGRATIONS.length);
  });
});
