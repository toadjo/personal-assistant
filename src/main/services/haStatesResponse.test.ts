import { describe, expect, it } from "vitest";
import { parseHaStatesResponse } from "./haStatesResponse";

describe("parseHaStatesResponse", () => {
  it("accepts valid Home Assistant states array", () => {
    const rows = parseHaStatesResponse([
      { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: " Kitchen " } },
      { entity_id: "switch.plain", state: "off" }
    ]);
    expect(rows).toHaveLength(2);
    const first = rows[0];
    expect(first).toBeDefined();
    expect(first!.entity_id).toBe("light.kitchen");
    expect(first!.attributes?.friendly_name).toBe(" Kitchen ");
  });

  it("rejects non-array and malformed rows", () => {
    expect(() => parseHaStatesResponse({})).toThrow(/Invalid Home Assistant states/);
    expect(() => parseHaStatesResponse([{ entity_id: "", state: "x" }])).toThrow();
    expect(() => parseHaStatesResponse(null)).toThrow();
  });
});
