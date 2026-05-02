import { describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { getTableColumnNames } from "./pragma";

function mockDb(rows: unknown[]): Database.Database {
  return {
    prepare: () => ({
      all: () => rows
    })
  } as unknown as Database.Database;
}

describe("getTableColumnNames", () => {
  it("collects validated name fields from PRAGMA-shaped rows", () => {
    const db = mockDb([
      { cid: 0, name: "id", type: "TEXT", notnull: 0, pk: 1 },
      { name: "attemptCount" },
      { unexpected: "x" }
    ]);
    expect(getTableColumnNames(db, "execution_logs")).toEqual(new Set(["id", "attemptCount"]));
  });
});
