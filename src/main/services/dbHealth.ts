import { getDb } from "../db";
import { resetWriteCounter } from "./optimizeTracker";

export interface DbHealthCheckResult {
  overall_health: "healthy" | "degraded" | "critical";
  integrity_check: {
    passed: boolean;
    error?: string;
  };
  schema_check: {
    passed: boolean;
    missing_tables: string[];
    extra_tables: string[];
  };
  data_check: {
    total_rows: number;
    orphaned_records: number;
    corrupted_records: number;
  };
  performance_check: {
    page_count: number;
    page_size: number;
    database_size_bytes: number;
    wal_enabled: boolean;
    wal_checkpoint_pending: boolean;
  };
  recommendations: string[];
}

const EXPECTED_TABLES = [
  "notes",
  "reminders",
  "tasks",
  "automation_rules",
  "app_settings",
  "schema_migrations",
  "devices_cache",
  "execution_logs",
  "renderer_errors"
];

export function checkDbHealth(): DbHealthCheckResult {
  const db = getDb();
  const result: DbHealthCheckResult = {
    overall_health: "healthy",
    integrity_check: { passed: false },
    schema_check: { passed: false, missing_tables: [], extra_tables: [] },
    data_check: { total_rows: 0, orphaned_records: 0, corrupted_records: 0 },
    performance_check: {
      page_count: 0,
      page_size: 0,
      database_size_bytes: 0,
      wal_enabled: false,
      wal_checkpoint_pending: false
    },
    recommendations: []
  };

  // 1. Integrity check
  try {
    const integrityResult = db.pragma("integrity_check") as { integrity_check: string }[];
    const integrityPassed = integrityResult.every((row) => row.integrity_check === "ok");
    result.integrity_check.passed = integrityPassed;
    if (!integrityPassed) {
      result.integrity_check.error = integrityResult.map((r) => r.integrity_check).join(", ");
      result.overall_health = "critical";
      result.recommendations.push("Database integrity check failed. Consider restoring from backup.");
    }
  } catch (err) {
    result.integrity_check.passed = false;
    result.integrity_check.error = err instanceof Error ? err.message : String(err);
    result.overall_health = "critical";
    result.recommendations.push("Integrity check failed. Database may be corrupted.");
  }

  // 2. Schema check
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{
      name: string;
    }>;
    const tableNames = new Set(tables.map((t) => t.name));

    result.schema_check.missing_tables = EXPECTED_TABLES.filter((t) => !tableNames.has(t));
    result.schema_check.extra_tables = [...tableNames].filter((t) => !EXPECTED_TABLES.includes(t));

    result.schema_check.passed = result.schema_check.missing_tables.length === 0;
    if (!result.schema_check.passed) {
      result.overall_health = result.overall_health === "healthy" ? "degraded" : result.overall_health;
      result.recommendations.push(`Missing tables: ${result.schema_check.missing_tables.join(", ")}. Run migrations.`);
    }
  } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
    result.schema_check.passed = false;
    result.overall_health = "critical";
    result.recommendations.push("Schema check failed. Database may be inaccessible.");
  }

  // 3. Data check
  try {
    let totalRows = 0;
    for (const table of EXPECTED_TABLES.filter((t) => t !== "schema_migrations")) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number };
        totalRows += count.c;
      } catch {
        // Table might not exist, skip
      }
    }
    result.data_check.total_rows = totalRows;

    // Check for orphaned records (simplified check)
    try {
      const orphanedNotes = db.prepare("SELECT COUNT(*) as c FROM notes WHERE id IS NULL OR id = ''").get() as {
        c: number;
      };
      result.data_check.orphaned_records += orphanedNotes.c;
    } catch {
      // Ignore if table doesn't exist
    }

    if (result.data_check.orphaned_records > 0) {
      result.overall_health = result.overall_health === "healthy" ? "degraded" : result.overall_health;
      result.recommendations.push(
        `${result.data_check.orphaned_records} orphaned records found. Clean up recommended.`
      );
    }
  } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
    result.overall_health = "degraded";
    result.recommendations.push("Data check failed. Some data may be inaccessible.");
  }

  // 4. Performance check
  try {
    const pageCount = db.pragma("page_count", { simple: true }) as number;
    const pageSize = db.pragma("page_size", { simple: true }) as number;
    const journalMode = db.pragma("journal_mode", { simple: true }) as string;

    result.performance_check.page_count = pageCount;
    result.performance_check.page_size = pageSize;
    result.performance_check.database_size_bytes = pageCount * pageSize;
    result.performance_check.wal_enabled = journalMode === "wal";

    // Check if WAL checkpoint is needed
    const walCheck = db.pragma("wal_checkpoint(PASSIVE)") as [number, number, number];
    result.performance_check.wal_checkpoint_pending = walCheck[1] > 0 || walCheck[2] > 0;

    if (result.performance_check.wal_checkpoint_pending) {
      result.overall_health = result.overall_health === "healthy" ? "degraded" : result.overall_health;
      result.recommendations.push("WAL checkpoint pending. Consider running checkpoint to improve performance.");
    }

    if (!result.performance_check.wal_enabled) {
      result.overall_health = result.overall_health === "healthy" ? "degraded" : result.overall_health;
      result.recommendations.push("WAL mode not enabled. Performance may be degraded.");
    }
  } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
    result.overall_health = "degraded";
    result.recommendations.push("Performance check failed. Database configuration may be suboptimal.");
  }

  return result;
}

export function optimizeDatabase(): { success: boolean; message: string } {
  const db = getDb();
  try {
    // Run WAL checkpoint
    db.pragma("wal_checkpoint(TRUNCATE)");

    // Run VACUUM to reclaim space
    db.pragma("vacuum");

    // Rebuild indexes
    db.pragma("optimize");

    // Reset write counter after successful optimize
    resetWriteCounter();

    return { success: true, message: "Database optimized successfully" };
  } catch (err) {
    return {
      success: false,
      message: `Optimization failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
