import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackupActions } from "./useBackupActions";
import type { BackupResult } from "./useBackupActions";

describe("useBackupActions", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mockRefreshAll = vi.fn();
  const mockSetStatus = vi.fn();
  let mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetError = vi.fn();
    // Ensure document.body has a proper structure for renderHook
    if (!document.body) {
      document.body = document.createElement("body");
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up document.body to prevent happy-dom state corruption
    if (document.body) {
      document.body.innerHTML = "";
    }
  });

  it("exports data, downloads JSON, revokes object URL, and sets success status", async () => {
    const mockPayload = { notes: 5, reminders: 3, tasks: 2, automation_rules: 1, app_settings: 1 };
    (window as any).assistantApi = {
      exportData: vi.fn().mockResolvedValue(mockPayload)
    };
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.exportData();

    expect(window.assistantApi.exportData).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    expect(mockSetStatus).toHaveBeenCalledWith("Backup exported.");
    expect(result.current.isExporting).toBe(false);

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it("imports cancel returns null and does not call the API", async () => {
    (window as any).assistantApi = {
      previewImportData: vi.fn().mockResolvedValue({ valid: true, notes: 5, reminders: 3, tasks: 2, automation_rules: 1, app_settings: 1, unsupported_sections: [], has_encrypted_content: false, version: "1.7.1", exportedAt: "2026-01-01T00:00:00Z" }),
      importData: vi.fn()
    };
    window.confirm = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    const file = new File(["{}"], "backup.json", { type: "application/json" });
    const importResult = await result.current.importData(file);

    expect(importResult).toBeNull();
    expect(window.assistantApi.previewImportData).toHaveBeenCalled();
    expect(window.assistantApi.importData).not.toHaveBeenCalled();
    expect(mockRefreshAll).not.toHaveBeenCalled();
    expect(result.current.isImporting).toBe(false);
  });

  it("confirmed import parses JSON, calls API, refreshes app data, and reports imported counts", async () => {
    const mockResult: BackupResult = { notes: 5, reminders: 3, tasks: 2, automation_rules: 1, app_settings: 1 };
    (window as any).assistantApi = {
      previewImportData: vi.fn().mockResolvedValue({ valid: true, notes: 5, reminders: 3, tasks: 2, automation_rules: 1, app_settings: 1, unsupported_sections: [], has_encrypted_content: false, version: "1.7.1", exportedAt: "2026-01-01T00:00:00Z" }),
      importData: vi.fn().mockResolvedValue(mockResult)
    };
    window.confirm = vi.fn().mockReturnValue(true);
    mockRefreshAll.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    const file = new File(["{}"], "backup.json", { type: "application/json" });
    const importResult = await result.current.importData(file);

    expect(importResult).toEqual(mockResult);
    expect(window.assistantApi.importData).toHaveBeenCalled();
    expect(mockRefreshAll).toHaveBeenCalled();
    expect(mockSetStatus).toHaveBeenCalledWith("Import complete: 5 notes, 3 reminders, 2 tasks, 1 rules, 1 settings.");
    expect(result.current.isImporting).toBe(false);
  });

  it("invalid import JSON reports an error and does not refresh", async () => {
    (window as any).assistantApi = {
      previewImportData: vi.fn().mockResolvedValue({ valid: true, notes: 5, reminders: 3, tasks: 2, automation_rules: 1, app_settings: 1, unsupported_sections: [], has_encrypted_content: false, version: "1.7.1", exportedAt: "2026-01-01T00:00:00Z" }),
      importData: vi.fn()
    };
    window.confirm = vi.fn().mockReturnValue(true);
    mockSetError = vi.fn();

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    const file = new File(["invalid json"], "backup.json", { type: "application/json" });
    const importResult = await result.current.importData(file);

    expect(importResult).toBeNull();
    expect(window.assistantApi.previewImportData).not.toHaveBeenCalled(); // JSON.parse fails before preview
    expect(window.assistantApi.importData).not.toHaveBeenCalled();
    expect(mockRefreshAll).not.toHaveBeenCalled();
    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isImporting).toBe(false);
  });

  it("reset cancel does not call the API", async () => {
    (window as any).assistantApi = {
      resetData: vi.fn()
    };
    window.confirm = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.resetData();

    expect(window.assistantApi.resetData).not.toHaveBeenCalled();
    expect(mockRefreshAll).not.toHaveBeenCalled();
    expect(result.current.isResetting).toBe(false);
  });

  it("confirmed reset calls API, refreshes app data, and reports success", async () => {
    (window as any).assistantApi = {
      resetData: vi.fn().mockResolvedValue(undefined)
    };
    window.confirm = vi.fn().mockReturnValue(true);
    mockRefreshAll.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.resetData();

    expect(window.assistantApi.resetData).toHaveBeenCalled();
    expect(mockRefreshAll).toHaveBeenCalled();
    expect(mockSetStatus).toHaveBeenCalledWith("All data has been reset.");
    expect(result.current.isResetting).toBe(false);
  });

  it("export error reports error and sets isExporting to false", async () => {
    (window as any).assistantApi = {
      exportData: vi.fn().mockRejectedValue(new Error("Export failed"))
    };

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.exportData();

    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it("import API error reports error and sets isImporting to false", async () => {
    (window as any).assistantApi = {
      importData: vi.fn().mockRejectedValue(new Error("Import failed"))
    };
    window.confirm = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    const file = new File(["{}"], "backup.json", { type: "application/json" });
    const importResult = await result.current.importData(file);

    expect(importResult).toBeNull();
    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isImporting).toBe(false);
  });

  it("reset API error reports error and sets isResetting to false", async () => {
    (window as any).assistantApi = {
      resetData: vi.fn().mockRejectedValue(new Error("Reset failed"))
    };
    window.confirm = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.resetData();

    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isResetting).toBe(false);
  });

  it("health check sets lastHealthCheck state on success", async () => {
    const healthCheckResult = {
      overall_health: "healthy" as const,
      integrity_check: { passed: true },
      schema_check: { passed: true, missing_tables: [], extra_tables: [] },
      data_check: { total_rows: 100, orphaned_records: 0, corrupted_records: 0 },
      performance_check: {
        page_count: 10,
        page_size: 4096,
        database_size_bytes: 40960,
        wal_enabled: true,
        wal_checkpoint_pending: false
      },
      recommendations: []
    };
    (window as any).assistantApi = {
      checkDbHealth: vi.fn().mockResolvedValue(healthCheckResult)
    };

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await act(async () => {
      await result.current.healthCheck();
    });

    expect(result.current.lastHealthCheck).toEqual(healthCheckResult);
    expect(result.current.isHealthChecking).toBe(false);
  });

  it("health check error does not set lastHealthCheck state", async () => {
    (window as any).assistantApi = {
      checkDbHealth: vi.fn().mockRejectedValue(new Error("Health check failed"))
    };

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.healthCheck();

    expect(result.current.lastHealthCheck).toBeNull();
    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isHealthChecking).toBe(false);
  });

  it("optimize sets lastOptimize state on success", async () => {
    const optimizeResult = {
      success: true,
      message: "Database optimized successfully"
    };
    (window as any).assistantApi = {
      optimizeDatabase: vi.fn().mockResolvedValue(optimizeResult)
    };
    mockRefreshAll.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await act(async () => {
      await result.current.optimize();
    });

    expect(result.current.lastOptimize).toEqual(optimizeResult);
    expect(result.current.isOptimizing).toBe(false);
  });

  it("optimize error does not set lastOptimize state", async () => {
    (window as any).assistantApi = {
      optimizeDatabase: vi.fn().mockRejectedValue(new Error("Optimization failed"))
    };

    const { result } = renderHook(() => useBackupActions(mockRefreshAll, mockSetStatus, mockSetError));

    await result.current.optimize();

    expect(result.current.lastOptimize).toBeNull();
    expect(mockSetError).toHaveBeenCalled();
    expect(result.current.isOptimizing).toBe(false);
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
});
