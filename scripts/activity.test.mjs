import { describe, expect, it } from "vitest";
import { formatDirtyStatus, selectLatestActivityEntries } from "./activity.mjs";

describe("formatDirtyStatus", () => {
  it("returns clean message when status is empty", () => {
    expect(formatDirtyStatus("")).toBe("(none - working directory clean)");
  });

  it("returns clean message when status is only whitespace", () => {
    expect(formatDirtyStatus("   \n  ")).toBe("(none - working directory clean)");
  });

  it("returns clean message when status is undefined", () => {
    expect(formatDirtyStatus(undefined)).toBe("(none - working directory clean)");
  });

  it("returns clean message when status is null", () => {
    expect(formatDirtyStatus(null)).toBe("(none - working directory clean)");
  });

  it("returns unchanged status when files are dirty", () => {
    const dirty = " M src/main.ts\n?? new-file.md";
    expect(formatDirtyStatus(dirty)).toBe(dirty);
  });
});

describe("selectLatestActivityEntries", () => {
  it("returns latest entries from markdown", () => {
    const markdown = `
## 2026-05-09: Oldest entry

- Files touched: oldest.ts
- Checks run: npm test
- Next action: start

## 2026-05-10: Older entry

- Files touched: old.ts
- Checks run: npm test
- Next action: move on

## 2026-05-11: Newer entry

- Files touched: new.ts
- Checks run: npm test
- Next action: continue
`;
    const entries = selectLatestActivityEntries(markdown, 3);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatch(/^## 2026-05-11/);
    expect(entries[1]).toMatch(/^## 2026-05-10/);
    expect(entries[2]).toMatch(/^## 2026-05-09/);
  });

  it("respects the count limit", () => {
    const markdown = `
## 2026-05-08: Entry four

- Files touched: d.ts

## 2026-05-09: Entry three

- Files touched: c.ts

## 2026-05-10: Entry two

- Files touched: b.ts

## 2026-05-11: Entry one

- Files touched: a.ts
`;
    const entries = selectLatestActivityEntries(markdown, 2);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatch(/^## 2026-05-11/);
    expect(entries[1]).toMatch(/^## 2026-05-10/);
  });

  it("returns empty array for empty content", () => {
    expect(selectLatestActivityEntries("")).toEqual([]);
  });

  it("returns empty array for null content", () => {
    expect(selectLatestActivityEntries(null)).toEqual([]);
  });

  it("returns empty array for undefined content", () => {
    expect(selectLatestActivityEntries(undefined)).toEqual([]);
  });

  it("returns empty array when markdown has no date entries", () => {
    const markdown = `# Title\n\nSome body text without entries.`;
    expect(selectLatestActivityEntries(markdown)).toEqual([]);
  });
});
