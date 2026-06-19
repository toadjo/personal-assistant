import { describe, expect, it } from "vitest";
import { LIFE_AREAS } from "./registry";

describe("lifeAreas registry", () => {
  it("has exactly 5 life areas registered", () => {
    expect(LIFE_AREAS).toHaveLength(5);
  });

  it("has unique IDs across all life areas", () => {
    const ids = LIFE_AREAS.map((area) => area.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("has unique display names across all life areas", () => {
    const names = LIFE_AREAS.map((area) => area.displayName);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("each life area has migrations", () => {
    for (const area of LIFE_AREAS) {
      expect(area.migrations).toBeDefined();
      expect(area.migrations.length).toBeGreaterThan(0);
    }
  });

  it("each life area has a backup module", () => {
    for (const area of LIFE_AREAS) {
      expect(area.backupModule).toBeDefined();
      expect(area.backupModule.id).toBe(area.id);
    }
  });

  it("each life area has a registerHandlers function", () => {
    for (const area of LIFE_AREAS) {
      expect(area.registerHandlers).toBeDefined();
      expect(typeof area.registerHandlers).toBe("function");
    }
  });

  it("backup payload keys are unique across all life areas", () => {
    const allKeys = LIFE_AREAS.flatMap((area) => area.backupModule.payloadKeys);
    const uniqueKeys = new Set(allKeys);
    expect(uniqueKeys.size).toBe(allKeys.length);
  });

  it("migration versions are unique across all life areas", () => {
    const allVersions = LIFE_AREAS.flatMap((area) => area.migrations.map((m) => m.version));
    const uniqueVersions = new Set(allVersions);
    expect(uniqueVersions.size).toBe(allVersions.length);
  });
});
